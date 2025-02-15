export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
}

export interface ChatContextType extends ChatState {
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  startNewConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
}

export interface ChatResponse {
  response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TranscriptionResponse {
  transcript: string;
  error?: string;
}

export interface ChatError {
  error: string;
} 