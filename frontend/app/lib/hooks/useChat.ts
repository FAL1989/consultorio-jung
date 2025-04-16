import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../api';
import type { Message, Conversation, SupabaseConversation } from '@/types/chat';
import type { Dispatch, SetStateAction } from 'react';
import type { AxiosError } from 'axios';

// Configurações de retry e anti-loop
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
let retryCount = 0;
let lastAuthRedirect = 0;

// Função de backoff exponencial
const getBackoffDelay = (retry: number) => Math.min(1000 * Math.pow(2, retry), 10000);

interface ChatHookReturn {
  messages: Message[];
  currentMessage: string;
  setCurrentMessage: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  handleSend: () => Promise<void>;
  clearChat: () => void;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  loadConversation: (conversation: Conversation) => void;
  startNewConversation: () => void;
  deleteConversation: (conversationId: string) => Promise<void>;
}

export function useChat(): ChatHookReturn {
  const { user, supabase } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Carrega conversas do usuário e configura subscription
  useEffect(() => {
    if (!user) return;

    const loadConversations = async (): Promise<void> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar conversas:', error);
        return;
      }

      if (data) {
        const typedConversations = data.map((conv: unknown): Conversation => {
          const supaConv = conv as SupabaseConversation;
          return {
            id: supaConv.id,
            user_id: supaConv.user_id,
            messages: supaConv.messages,
            created_at: new Date(supaConv.created_at),
            updated_at: new Date(supaConv.updated_at),
          };
        });
        setConversations(typedConversations);
      }
    };

    // Carrega conversas iniciais
    loadConversations();

    // Configura subscription para mudanças
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Desativa temporariamente a subscription durante operações de deleção
          if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = payload.old.id;
            
            // Atualiza o estado local apenas se a conversa ainda existir
            setConversations(prev => {
              const conversationExists = prev.some(conv => conv.id === deletedId);
              if (!conversationExists) return prev;
              return prev.filter(conv => conv.id !== deletedId);
            });

            if (currentConversation?.id === deletedId) {
              setCurrentConversation(null);
              setMessages([]);
            }
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Para outros tipos de eventos, recarrega todas as conversas
            await loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, supabase, currentConversation]);

  const handleSend = useCallback(async (): Promise<void> => {
    if (!currentMessage.trim() || !user) return;
    setIsLoading(true);
    
    try {
      // Anti-loop check
      if (Date.now() - lastAuthRedirect < 5000 && retryCount >= MAX_RETRIES) {
        throw new Error('Detected auth redirect loop. Aborting to prevent infinite cycle.');
      }
      
      // Adiciona mensagem do usuário
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content: currentMessage,
        role: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      console.log("📤 Enviando mensagem para a API...");
      
      // Usa o apiClient com retry automático
      const response = await apiClient.post('/api/chat', {
        message: currentMessage,
        conversationId: currentConversation?.id || null,
        user_id: user.id,
      });

      console.log("✅ Resposta recebida com sucesso");
      const data = response.data;

      // Adiciona resposta do assistente
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: {
          text: data.response.text,
          concepts: data.response.concepts,
          references: data.response.references
        },
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Se não houver conversa atual, cria uma nova
      if (!currentConversation) {
        console.log("📝 Criando nova conversa...");
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert([
            {
              user_id: user.id,
              messages: [userMessage, assistantMessage],
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("❌ Erro ao criar conversa:", error);
          throw error;
        }

        if (newConversation) {
          const typedConversation: Conversation = {
            id: newConversation.id,
            user_id: newConversation.user_id,
            messages: newConversation.messages,
            created_at: new Date(newConversation.created_at),
            updated_at: new Date(newConversation.updated_at),
          };
          setCurrentConversation(typedConversation);
          setConversations(prev => [typedConversation, ...prev]);
          console.log("✅ Nova conversa criada com sucesso");
        }
      } else {
        // Atualiza conversa existente
        console.log("📝 Atualizando conversa existente...");
        const updatedMessages = [...messages, userMessage, assistantMessage];
        const { error } = await supabase
          .from('conversations')
          .update({
            messages: updatedMessages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentConversation.id);

        if (error) {
          console.error("❌ Erro ao atualizar conversa:", error);
          throw error;
        }

        setCurrentConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: updatedMessages,
            updated_at: new Date(),
          };
        });
        console.log("✅ Conversa atualizada com sucesso");
      }

      // Limpa mensagem atual
      setCurrentMessage('');
      // Reset retry count on success
      retryCount = 0;
      
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      // Remove a última mensagem do usuário em caso de erro
      setMessages(prev => prev.slice(0, -1));
      
      if (error instanceof Error) {
        if ((error as AxiosError)?.response?.status === 401 || error.message.includes('Não autorizado')) {
          retryCount++;
          lastAuthRedirect = Date.now();
          if (retryCount < MAX_RETRIES) {
            console.warn(`🔄 Tentativa de reautenticação ${retryCount}/${MAX_RETRIES}...`);
            setTimeout(() => {
              window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}&retry=${retryCount}`;
            }, RETRY_DELAY);
            return;
          } else {
            console.error('🚫 Máximo de tentativas de autenticação atingido.');
            alert('Não foi possível autenticar após múltiplas tentativas. Por favor, limpe os cookies e tente novamente.');
          }
        } else if (error.message.includes('auth redirect loop')) {
          alert('Detectado um loop de autenticação. Por favor, limpe os cookies e tente novamente.');
        } else if (error.message.includes('múltiplas tentativas')) {
          alert('Erro de conexão com o servidor. Por favor, verifique sua internet e tente novamente.');
        } else {
          alert(error.message);
        }
      } else {
        alert('Erro ao enviar mensagem. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, user, supabase, currentConversation, messages]);

  const clearChat = useCallback((): void => {
    setMessages([]);
    setCurrentMessage('');
    setCurrentConversation(null);
  }, []);

  const loadConversation = useCallback((conversation: Conversation): void => {
    setCurrentConversation(conversation);
    setMessages(conversation.messages);
  }, []);

  const startNewConversation = useCallback((): void => {
    setMessages([]);
    setCurrentMessage('');
    setCurrentConversation(null);
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        throw error;
      }

      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      // Em caso de erro, recarrega as conversas do servidor
      const { data, error: loadError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!loadError && data) {
        const typedConversations = data.map((conv: unknown): Conversation => {
          const supaConv = conv as SupabaseConversation;
          return {
            id: supaConv.id,
            user_id: supaConv.user_id,
            messages: supaConv.messages,
            created_at: new Date(supaConv.created_at),
            updated_at: new Date(supaConv.updated_at),
          };
        });
        setConversations(typedConversations);
      }
    }
  }, [user, supabase, currentConversation]);

  return {
    messages,
    currentMessage,
    setCurrentMessage,
    isLoading,
    handleSend,
    clearChat,
    conversations,
    currentConversation,
    loadConversation,
    startNewConversation,
    deleteConversation,
  };
} 