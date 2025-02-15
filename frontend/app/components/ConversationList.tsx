'use client';

import type { Conversation } from '@/types/chat';
import { PlusIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
}

export function ConversationList({
  conversations,
  currentConversationId,
  onSelect,
  onNewChat,
}: ConversationListProps): JSX.Element {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-64 h-screen bg-gray-50 p-4 border-r">
      <button
        onClick={onNewChat}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mb-4"
      >
        <PlusIcon className="h-5 w-5" />
        <span>Nova Conversa</span>
      </button>

      <div className="space-y-2">
        {conversations.map((conversation) => {
          // Pega a primeira mensagem do usuário para usar como título
          const firstUserMessage = conversation.messages.find(
            (msg) => msg.role === 'user'
          );
          const title = firstUserMessage?.content.slice(0, 30) + '...' || 'Nova conversa';

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left ${
                conversation.id === currentConversationId
                  ? 'bg-gray-100 border border-indigo-200'
                  : ''
              }`}
            >
              <ChatBubbleLeftIcon className="h-5 w-5 text-gray-500 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {title}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(conversation.created_at)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
} 