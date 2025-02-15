import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Message } from '@/types/chat';

export function useChat() {
  const { user, supabase } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = useCallback(async () => {
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

      // Salva conversa no Supabase
      await supabase
        .from('conversations')
        .insert([
          {
            user_id: user.id,
            messages: [userMessage, assistantMessage],
          },
        ]);

      // Limpa mensagem atual
      setCurrentMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      // Implementar tratamento de erro adequado
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, user, supabase]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentMessage('');
  }, []);

  return {
    messages,
    currentMessage,
    setCurrentMessage,
    isLoading,
    handleSend,
    clearChat,
  };
} 