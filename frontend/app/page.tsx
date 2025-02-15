"use client";

import { AudioRecorder } from "@/components/AudioRecorder";
import { ChatHistory } from "@/components/ChatHistory";
import { MessageInput } from "@/components/MessageInput";
import { ConversationList } from "@/components/ConversationList";
import { useChat } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ChatPage(): JSX.Element {
  const { session, signIn } = useAuth();
  const { 
    messages, 
    currentMessage, 
    setCurrentMessage, 
    handleSend,
    isLoading,
    conversations,
    currentConversation,
    loadConversation,
    startNewConversation
  } = useChat();

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-10 bg-white rounded-xl shadow-lg">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Diálogos Junguianos
          </h2>
          <button
            onClick={() => signIn()}
            className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <ConversationList 
        conversations={conversations}
        currentConversationId={currentConversation?.id ?? null}
        onSelect={loadConversation}
        onNewChat={startNewConversation}
      />

      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-8">
          <h1 className="text-4xl font-bold text-center mb-8">
            Consultório do Dr. Jung
          </h1>
          
          <div className="bg-white rounded-lg shadow-xl p-6 space-y-4 max-w-4xl mx-auto">
            <ChatHistory messages={messages} />
            
            <div className="border-t pt-4">
              <AudioRecorder 
                onTranscription={(text: string) => {
                  setCurrentMessage((prev: string) => prev + " " + text.trim());
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
        </div>
      </main>
    </div>
  );
} 