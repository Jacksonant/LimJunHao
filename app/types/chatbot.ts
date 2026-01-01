export type ChatMode = 'basic' | 'tools' | 'rag';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  user_id: string;
  message: string;
  mode: ChatMode;
  system_prompt?: string;
}

export interface ChatResponse {
  response: string;
}

export interface KnowledgeRequest {
  text: string;
}

export interface ClearRequest {
  user_id: string;
}

export interface ApiResponse {
  status: string;
  message?: string;
  error?: string;
}
