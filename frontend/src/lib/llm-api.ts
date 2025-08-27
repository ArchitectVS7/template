import type { 
  LLMModel, 
  LLMConversation, 
  LLMMessage, 
  UsageStats,
  ChatResponse,
  StreamChunk,
  CreateConversationRequest,
  SendMessageRequest,
  APIResponse,
  PaginatedResponse
} from '../types/llm';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class LLMAPIError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'LLMAPIError';
  }
}

class LLMAPIClient {
  private getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}/api/llm${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new LLMAPIError(response.status, errorData.message || 'Request failed');
    }

    return response.json();
  }

  // Conversation Management
  async createConversation(data: CreateConversationRequest): Promise<LLMConversation> {
    const response = await this.makeRequest<APIResponse<LLMConversation>>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async getConversations(limit = 50, offset = 0): Promise<LLMConversation[]> {
    const response = await this.makeRequest<PaginatedResponse<LLMConversation>>(
      `/conversations?limit=${limit}&offset=${offset}`
    );
    return response.data;
  }

  async getConversation(conversationId: string): Promise<{ conversation: LLMConversation; messages: LLMMessage[] }> {
    const response = await this.makeRequest<APIResponse<{ conversation: LLMConversation; messages: LLMMessage[] }>>(
      `/conversations/${conversationId}`
    );
    return response.data;
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<LLMConversation> {
    const response = await this.makeRequest<APIResponse<LLMConversation>>(
      `/conversations/${conversationId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ title }),
      }
    );
    return response.data;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.makeRequest(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Message Management
  async sendMessage(
    conversationId: string, 
    data: SendMessageRequest
  ): Promise<ChatResponse> {
    const response = await this.makeRequest<APIResponse<ChatResponse>>(
      `/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async sendStreamingMessage(
    conversationId: string,
    data: SendMessageRequest,
    onChunk: (chunk: StreamChunk) => void,
    onComplete: (data: { conversationId: string; messageId: string }) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = this.getAuthToken();
    
    const response = await fetch(`${API_BASE}/api/llm/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ ...data, stream: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new LLMAPIError(response.status, errorData.message || 'Request failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
              
              if (data.type === 'complete') {
                onComplete({
                  conversationId: data.conversationId,
                  messageId: data.messageId,
                });
              } else if (data.type === 'error') {
                onError(data.error || 'Stream error');
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Models and Configuration
  async getModels(): Promise<LLMModel[]> {
    const response = await this.makeRequest<APIResponse<LLMModel[]>>('/models');
    return response.data;
  }

  async getUsageStats(days = 30): Promise<UsageStats> {
    const response = await this.makeRequest<APIResponse<UsageStats>>(`/usage?days=${days}`);
    return response.data;
  }
}

export const llmApi = new LLMAPIClient();
export { LLMAPIError };