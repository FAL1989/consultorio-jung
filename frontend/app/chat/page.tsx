'use client';

import { useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ChatHistory } from "@/components/ChatHistory";
import { MessageInput } from "@/components/MessageInput";
import { ConversationList } from "@/components/ConversationList";
import { useChat } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ChatPage(): JSX.Element {
  const { session } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { 
    messages, 
    currentMessage, 
    setCurrentMessage, 
    handleSend,
    isLoading,
    conversations,
    currentConversation,
    loadConversation,
    startNewConversation,
    deleteConversation
  } = useChat();

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-10 bg-white dark:bg-slate-900 rounded-xl shadow-lg">
          <h2 className="mt-6 text-center text-3xl font-bold">
            Acesso Negado
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Por favor, faça login para continuar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50
        sidebar
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <ConversationList 
          conversations={conversations}
          currentConversationId={currentConversation?.id ?? null}
          onSelect={(conv) => {
            loadConversation(conv);
            setIsSidebarOpen(false);
          }}
          onNewChat={() => {
            startNewConversation();
            setIsSidebarOpen(false);
          }}
          onDelete={deleteConversation}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 relative w-full">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute left-4 top-1/2 -translate-y-1/2 md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Abrir menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <h1 className="app-title">Diálogos Junguianos</h1>
            <p className="app-subtitle">
              Um espaço seguro para autoconhecimento e desenvolvimento pessoal
            </p>
            
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Chat area */}
        <div className="chat-area">
          <div className="messages-container">
            <ChatHistory messages={messages} isLoading={isLoading} />
          </div>
        </div>

        {/* Input area */}
        <div className="input-container">
          <div className="max-w-[800px] mx-auto">
            <AudioRecorder 
              onTranscription={(text) => {
                setCurrentMessage((prev) => prev + " " + text.trim());
              }}
            />
            
            <MessageInput
              value={currentMessage}
              onChange={setCurrentMessage}
              onSend={handleSend}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
} 