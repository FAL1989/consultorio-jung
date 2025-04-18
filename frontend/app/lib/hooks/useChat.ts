import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import type { Message, Conversation, SupabaseConversation, MessageContent } from '@/types/chat';
import type { Dispatch, SetStateAction } from 'react';

// --- Define type for metadata event using types from MessageContent ---
interface MetadataPayload {
  // Use the inline array types directly from MessageContent definition
  concepts?: MessageContent['concepts'];
  references?: MessageContent['references'];
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
  deleteConversation: (conversationId: string) => Promise<void>;
}

export function useChat(): ChatHookReturn {
  const { user, supabase, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const assistantMessageRef = useRef<Message | null>(null);

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
    if (!currentMessage.trim() || !user || !session) return;
    setIsLoading(true);
    const messageToSend = currentMessage;
    setCurrentMessage('');

    // 1. Add user message to state
    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: messageToSend,
      role: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // 2. Add placeholder for assistant message
    const assistantPlaceholder: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: { text: '...', concepts: undefined, references: undefined },
      timestamp: new Date(),
    };
    assistantMessageRef.current = assistantPlaceholder;
    setMessages(prev => [...prev, assistantPlaceholder]);

    try {
      const token = session.access_token;

      // 3. Use fetch for POST request with stream
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageToSend,
          conversationId: currentConversation?.id || null,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorBody || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream não disponível na resposta.');
      }

      // 4. Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentAssistantText = '';
      let finalMetadata: MetadataPayload | null = null;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = 'message';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
            continue;
          }

          if (line.startsWith('data:')) {
            const dataJson = line.substring(5).trim();
            if (!dataJson) continue;

            try {
              const data = JSON.parse(dataJson);

              if (eventType === 'metadata') {
                finalMetadata = data as MetadataPayload;
                if (assistantMessageRef.current && typeof assistantMessageRef.current.content === 'object') {
                  assistantMessageRef.current.content.concepts = data.concepts;
                  assistantMessageRef.current.content.references = data.references;
                }
                setMessages(prev => prev.map(msg => {
                  if (msg.id === assistantPlaceholder.id && typeof msg.content === 'object') {
                    return { ...msg, content: { ...msg.content, concepts: data.concepts, references: data.references } };
                  }
                  return msg;
                }));

              } else if (eventType === 'error') {
                console.error("❌ Erro recebido via stream:", data.error);
                throw new Error(data.error || 'Erro no processamento do backend');
              } else {
                currentAssistantText += data.text;
                setMessages(prev => prev.map(msg => {
                  if (msg.id === assistantPlaceholder.id && typeof msg.content === 'object') {
                    return { ...msg, content: { ...msg.content, text: currentAssistantText } };
                  }
                  return msg;
                }));
              }

            } catch (e) {
              console.error('Erro ao parsear JSON do SSE:', e, 'Linha:', line);
            }
            eventType = 'message';
          }
        }
      }
      reader.releaseLock();

      // 5. Update Supabase *after* stream completion and metadata received
      if (finalMetadata && assistantMessageRef.current) {
        const finalAssistantMessage: Message = {
          ...assistantMessageRef.current,
          content: {
            text: currentAssistantText,
            concepts: finalMetadata.concepts,
            references: finalMetadata.references,
          }
        };
        const messagesToSave = [...messages.filter(m => m.id !== assistantPlaceholder.id), userMessage, finalAssistantMessage];

        if (!currentConversation) {
          const { data: newConvData, error: insertError } = await supabase
            .from('conversations')
            .insert([{ user_id: user.id, messages: messagesToSave }])
            .select()
            .single();

          if (insertError) throw insertError;
          if (newConvData) {
            const typedConversation: Conversation = {
              id: newConvData.id,
              user_id: newConvData.user_id,
              messages: newConvData.messages,
              created_at: new Date(newConvData.created_at),
              updated_at: new Date(newConvData.updated_at),
            };
            setCurrentConversation(typedConversation);
          }

        } else {
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ messages: messagesToSave, updated_at: new Date().toISOString() })
            .eq('id', currentConversation.id);

          if (updateError) throw updateError;

          setCurrentConversation(prev => prev ? { ...prev, messages: messagesToSave, updated_at: new Date() } : null);
        }
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== assistantPlaceholder.id));
      }
      assistantMessageRef.current = null;

    } catch (error) {
      console.error('❌ Erro ao processar mensagem via stream:', error);
      alert(error instanceof Error ? error.message : 'Ocorreu um erro desconhecido');
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id && msg.id !== assistantPlaceholder.id));
      assistantMessageRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, user, supabase, session, currentConversation, messages]);

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