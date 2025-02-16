import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { Message, Conversation, SupabaseConversation } from '@/types/chat';
import type { Dispatch, SetStateAction } from 'react';

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
      // Adiciona mensagem do usuário
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content: currentMessage,
        role: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Envia para a API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          conversationId: currentConversation?.id,
          userId: user.id,
        }),
      });

      let errorData;
      let data;
      
      try {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch (e) {
          console.error('Erro ao fazer parse da resposta:', textResponse);
          throw new Error('Erro ao processar resposta do servidor. Por favor, tente novamente.');
        }
        
        if (!response.ok) {
          errorData = data;
          if (response.status === 429) {
            const resetTime = new Date(errorData.resetTime);
            const waitSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
            throw new Error(`${errorData.message} Tente novamente em ${waitSeconds} segundos.`);
          }
          throw new Error(errorData.error || 'Falha na comunicação com o servidor');
        }
      } catch (error) {
        // Remove a última mensagem do usuário em caso de erro
        setMessages(prev => prev.slice(0, -1));
        throw error;
      }

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
          throw error;
        }

        if (newConversation) {
          const supaConv = newConversation as unknown as SupabaseConversation;
          const typedConversation: Conversation = {
            id: supaConv.id,
            user_id: supaConv.user_id,
            messages: supaConv.messages,
            created_at: new Date(supaConv.created_at),
            updated_at: new Date(supaConv.updated_at),
          };
          setCurrentConversation(typedConversation);
          setConversations(prev => [typedConversation, ...prev]);
        }
      } else {
        // Atualiza conversa existente
        const updatedMessages = [...currentConversation.messages, userMessage, assistantMessage];
        const { error } = await supabase
          .from('conversations')
          .update({
            messages: updatedMessages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentConversation.id);

        if (error) {
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
      }

      // Limpa mensagem atual
      setCurrentMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Mostra erro para o usuário
      alert(error instanceof Error ? error.message : 'Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, user, supabase, currentConversation]);

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