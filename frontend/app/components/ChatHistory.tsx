'use client';

import type { Message } from '@/types/chat';

interface ChatHistoryProps {
  messages: Message[];
}

export function ChatHistory({ messages }: ChatHistoryProps): JSX.Element {
  const formatMessageTime = (date: Date): string => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'agora mesmo';
    if (diffInMinutes < 60) return `há ${diffInMinutes} minutos`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `há ${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'há 1 dia';
    if (diffInDays < 7) return `há ${diffInDays} dias`;
    
    return messageDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <div
              className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
              }`}
            >
              {formatMessageTime(message.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 