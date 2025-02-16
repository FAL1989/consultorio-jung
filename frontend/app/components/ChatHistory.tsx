'use client';

import type { Message } from '@/types/chat';

interface ChatHistoryProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatHistory({ messages, isLoading = false }: ChatHistoryProps): JSX.Element {
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
    <div className="h-full overflow-y-auto px-2 md:px-4 py-4">
      <div className="flex flex-col space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'message-user rounded-tr-none'
                  : 'message-assistant rounded-tl-none'
              }`}
            >
              <div className="text-sm md:text-base">
                <p className="whitespace-pre-wrap break-words mb-2">{message.content}</p>
              </div>
              <div
                className={`text-[10px] md:text-xs ${
                  message.role === 'user' ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-300'
                }`}
              >
                {formatMessageTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start">
            <div className="message-assistant rounded-2xl px-4 py-3 max-w-[85%] md:max-w-[75%] rounded-tl-none animate-pulse">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs md:text-sm text-gray-500 ml-2">Dr. Jung está digitando...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 