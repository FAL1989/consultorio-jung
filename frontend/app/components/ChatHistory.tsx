'use client';

interface MessageContent {
  text: string;
  concepts?: Array<{
    name: string;
    description: string;
  }>;
  references?: Array<{
    title: string;
    author: string;
    year: string;
  }>;
}

interface Message {
  id: string;
  content: MessageContent | string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

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
                <p className="whitespace-pre-wrap break-words mb-2">
                  {typeof message.content === 'string' 
                    ? message.content 
                    : message.content.text}
                </p>
                
                {message.role === 'assistant' && typeof message.content !== 'string' && message.content.concepts && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium mb-2">Conceitos Relacionados:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.content.concepts.map((concept, index) => (
                        <div 
                          key={index}
                          className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg text-sm cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                          title={concept.description}
                        >
                          {concept.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {message.role === 'assistant' && typeof message.content !== 'string' && message.content.references && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium mb-2">Referências:</p>
                    <div className="space-y-1">
                      {message.content.references.map((ref, index) => (
                        <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          {ref.author} ({ref.year}) - {ref.title}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
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