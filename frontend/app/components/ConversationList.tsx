'use client';

import type { Conversation } from '@/types/chat';
import { PlusIcon, ChatBubbleLeftIcon, TrashIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/hooks/useAuth';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
  onDelete: (conversationId: string) => Promise<void>;
}

export function ConversationList({
  conversations,
  currentConversationId,
  onSelect,
  onNewChat,
  onDelete,
}: ConversationListProps): JSX.Element {
  const { signOut } = useAuth();
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-2 md:p-4 bg-white/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onNewChat}
          className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Nova Conversa</span>
        </button>

        <button
          onClick={() => signOut()}
          className="p-2 rounded-lg text-gray-600 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Sair"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {conversations.map((conversation) => {
          const firstUserMessage = conversation.messages.find(
            (msg) => msg.role === 'user'
          );
          const title = typeof firstUserMessage?.content === 'string' 
            ? firstUserMessage.content.slice(0, 30) + '...' 
            : firstUserMessage?.content?.text?.slice(0, 30) + '...' || 'Nova conversa';

          return (
            <div
              key={conversation.id}
              className={`group relative flex items-center space-x-3 p-2 rounded-lg hover:bg-white/70 transition-colors cursor-pointer ${
                conversation.id === currentConversationId
                  ? 'bg-white/80 border-indigo-100 shadow-sm'
                  : ''
              }`}
              onClick={() => onSelect(conversation)}
            >
              <div className="flex items-start space-x-3 min-w-0 flex-1">
                <ChatBubbleLeftIcon className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {formatDate(conversation.created_at)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation.id);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Deletar conversa"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
} 