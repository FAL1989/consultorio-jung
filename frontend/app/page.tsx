"use client";

import { useState, useEffect } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ChatHistory } from "@/components/ChatHistory";
import { MessageInput } from "@/components/MessageInput";
import { useChat } from "@/lib/hooks/useChat";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ChatPage() {
  const { session, signIn } = useAuth();
  const { 
    messages, 
    currentMessage, 
    setCurrentMessage, 
    handleSend,
    isLoading 
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
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Consultório do Dr. Jung
        </h1>
        
        <div className="bg-white rounded-lg shadow-xl p-6 space-y-4">
          <ChatHistory messages={messages} />
          
          <div className="border-t pt-4">
            <AudioRecorder 
              onTranscription={(text) => setCurrentMessage(prev => prev + " " + text)}
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
  );
} 