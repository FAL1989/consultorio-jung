export interface MessageContent {
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

export interface Message {
  id: string;
  content: MessageContent | string;
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

export interface SupabaseConversation {
  id: string;
  user_id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
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
  response: MessageContent;
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