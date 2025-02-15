'use client';

import { useRef, useEffect } from 'react';
import type { Message } from '@/types/chat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatHistoryProps {
  messages: Message[];
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col space-y-4 p-4 h-[600px] overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex flex-col ${
            message.role === 'user' ? 'items-end' : 'items-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            <span className="text-xs opacity-70 mt-2 block">
              {format(message.timestamp, "d 'de' MMMM', às' HH:mm", {
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
} 