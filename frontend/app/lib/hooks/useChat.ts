import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { Message, Conversation } from '@/types/chat';
import type { Dispatch, SetStateAction } from 'react';

interface SupabaseConversation {
  id: string;
  user_id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

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
}

export function useChat(): ChatHookReturn {
  const { user, supabase } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Carrega conversas do usuário
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
        const typedConversations = (data as SupabaseConversation[]).map((conv): Conversation => ({
          id: conv.id,
          user_id: conv.user_id,
          messages: conv.messages,
          created_at: new Date(conv.created_at),
          updated_at: new Date(conv.updated_at),
        }));
        setConversations(typedConversations);
      }
    };

    loadConversations();
  }, [user, supabase]);

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

      if (!response.ok) {
        throw new Error('Falha na comunicação com o servidor');
      }

      const data = await response.json();

      // Adiciona resposta do assistente
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: data.response,
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
          const typedConversation: Conversation = {
            id: newConversation.id as string,
            user_id: newConversation.user_id as string,
            messages: newConversation.messages as Message[],
            created_at: new Date(newConversation.created_at as string),
            updated_at: new Date(newConversation.updated_at as string),
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
      // Implementar tratamento de erro adequado
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
  };
} 