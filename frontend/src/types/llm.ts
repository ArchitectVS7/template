export interface LLMModel {
  id: string;
  name: string;
  description: string;
  inputCost: number;
  outputCost: number;
  maxTokens: number;
}

export interface LLMConversation {
  id: string;
  userId: string;
  title: string | null;
  model: string;
  totalTokens: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  messages?: LLMMessage[];
  _count?: {
    messages: number;
  };
}

export interface LLMMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  tokens: number;
  cost: number;
  createdAt: string;
}

export interface ChatSettings {
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  model: string;
}

export interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  period: string;
}

export interface ChatResponse {
  message: string;
  tokens: number;
  cost: number;
}

export interface StreamChunk {
  type: 'chunk' | 'complete' | 'error';
  content?: string;
  conversationId?: string;
  messageId?: string;
  error?: string;
}

export interface CreateConversationRequest {
  title?: string;
  model?: string;
}

export interface SendMessageRequest {
  content: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}