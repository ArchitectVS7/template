import Anthropic from '@anthropic-ai/sdk';
import { db } from './database';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  message: string;
  tokens: number;
  cost: number;
}

interface StreamResponse {
  conversationId: string;
  messageId: string;
}

// Anthropic pricing per 1M tokens (as of 2024)
const ANTHROPIC_PRICING = {
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
};

class LLMService {
  private anthropic: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      if (process.env.NODE_ENV !== 'test') {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      // In test environment, create a mock client
      this.anthropic = {} as Anthropic;
    } else {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Calculate cost for a given model and token usage
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = ANTHROPIC_PRICING[model as keyof typeof ANTHROPIC_PRICING];
    if (!pricing) {
      logger.warn(`Unknown model pricing: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    
    return parseFloat((inputCost + outputCost).toFixed(6));
  }

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title?: string, model: string = 'claude-3-sonnet-20240229') {
    try {
      const conversation = await db.prisma.lLMConversation.create({
        data: {
          userId,
          title: title || `Conversation ${new Date().toLocaleDateString()}`,
          model,
        },
      });

      logger.info('Created LLM conversation', {
        conversationId: conversation.id,
        userId,
        model,
      });

      return conversation;
    } catch (error) {
      logger.error('Failed to create conversation:', error);
      throw createError('Failed to create conversation', 500);
    }
  }

  /**
   * Get user conversations
   */
  async getUserConversations(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const conversations = await db.prisma.lLMConversation.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return conversations;
    } catch (error) {
      logger.error('Failed to get user conversations:', error);
      throw createError('Failed to get conversations', 500);
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string, userId: string) {
    try {
      // Verify conversation belongs to user
      const conversation = await db.prisma.lLMConversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw createError('Conversation not found', 404);
      }

      const messages = await db.prisma.lLMMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      return { conversation, messages };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      logger.error('Failed to get conversation messages:', error);
      throw createError('Failed to get messages', 500);
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<ChatResponse> {
    try {
      // Verify conversation belongs to user
      const conversation = await db.prisma.lLMConversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw createError('Conversation not found', 404);
      }

      // Build message history
      const messages: ChatMessage[] = conversation.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Add current user message
      messages.push({ role: 'user', content });

      // Save user message to database
      await db.prisma.lLMMessage.create({
        data: {
          conversationId,
          role: 'user',
          content,
          tokens: 0, // We'll estimate tokens later
          cost: 0,
        },
      });

      // Make API call to Anthropic
      const response = await this.anthropic.messages.create({
        model: conversation.model,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || 'You are a helpful AI assistant for developers.',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const assistantMessage = response.content[0];
      if (assistantMessage.type !== 'text') {
        throw createError('Unexpected response type from API', 500);
      }

      // Calculate costs
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      const cost = this.calculateCost(conversation.model, inputTokens, outputTokens);

      // Save assistant message
      const savedMessage = await db.prisma.lLMMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: assistantMessage.text,
          tokens: outputTokens,
          cost,
        },
      });

      // Update conversation totals
      await db.prisma.lLMConversation.update({
        where: { id: conversationId },
        data: {
          totalTokens: { increment: totalTokens },
          totalCost: { increment: cost },
          updatedAt: new Date(),
        },
      });

      logger.info('LLM message processed', {
        conversationId,
        userId,
        inputTokens,
        outputTokens,
        cost,
        model: conversation.model,
      });

      return {
        message: assistantMessage.text,
        tokens: outputTokens,
        cost,
      };
    } catch (error) {
      logger.error('Failed to send LLM message:', {
        error: error instanceof Error ? error.message : error,
        conversationId,
        userId,
      });
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      
      throw createError('Failed to send message', 500);
    }
  }

  /**
   * Send a streaming message
   */
  async sendStreamingMessage(
    conversationId: string,
    userId: string,
    content: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {},
    onChunk: (chunk: string) => void
  ): Promise<StreamResponse> {
    try {
      // Verify conversation belongs to user
      const conversation = await db.prisma.lLMConversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw createError('Conversation not found', 404);
      }

      // Build message history
      const messages: ChatMessage[] = conversation.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Add current user message
      messages.push({ role: 'user', content });

      // Save user message to database
      await db.prisma.lLMMessage.create({
        data: {
          conversationId,
          role: 'user',
          content,
          tokens: 0,
          cost: 0,
        },
      });

      // Create placeholder assistant message
      const assistantMessage = await db.prisma.lLMMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: '',
          tokens: 0,
          cost: 0,
        },
      });

      // Make streaming API call to Anthropic
      const stream = await this.anthropic.messages.create({
        model: conversation.model,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || 'You are a helpful AI assistant for developers.',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      });

      let fullContent = '';
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            const deltaText = chunk.delta.text;
            fullContent += deltaText;
            onChunk(deltaText);
          }
        } else if (chunk.type === 'message_start') {
          inputTokens = chunk.message.usage.input_tokens;
        } else if (chunk.type === 'message_delta') {
          outputTokens = chunk.usage.output_tokens;
        }
      }

      // Calculate final cost
      const totalTokens = inputTokens + outputTokens;
      const cost = this.calculateCost(conversation.model, inputTokens, outputTokens);

      // Update assistant message with final content
      await db.prisma.lLMMessage.update({
        where: { id: assistantMessage.id },
        data: {
          content: fullContent,
          tokens: outputTokens,
          cost,
        },
      });

      // Update conversation totals
      await db.prisma.lLMConversation.update({
        where: { id: conversationId },
        data: {
          totalTokens: { increment: totalTokens },
          totalCost: { increment: cost },
          updatedAt: new Date(),
        },
      });

      logger.info('LLM streaming message processed', {
        conversationId,
        userId,
        inputTokens,
        outputTokens,
        cost,
        model: conversation.model,
      });

      return {
        conversationId,
        messageId: assistantMessage.id,
      };
    } catch (error) {
      logger.error('Failed to send streaming LLM message:', {
        error: error instanceof Error ? error.message : error,
        conversationId,
        userId,
      });
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      
      throw createError('Failed to send streaming message', 500);
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string) {
    try {
      const conversation = await db.prisma.lLMConversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw createError('Conversation not found', 404);
      }

      await db.prisma.lLMConversation.delete({
        where: { id: conversationId },
      });

      logger.info('Deleted LLM conversation', {
        conversationId,
        userId,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      logger.error('Failed to delete conversation:', error);
      throw createError('Failed to delete conversation', 500);
    }
  }

  /**
   * Get user usage statistics
   */
  async getUserUsageStats(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await db.prisma.lLMConversation.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        _sum: {
          totalTokens: true,
          totalCost: true,
        },
        _count: {
          id: true,
        },
      });

      const messageCount = await db.prisma.lLMMessage.count({
        where: {
          conversation: { userId },
          createdAt: { gte: startDate },
        },
      });

      return {
        totalConversations: stats._count.id || 0,
        totalMessages: messageCount,
        totalTokens: stats._sum.totalTokens || 0,
        totalCost: stats._sum.totalCost || 0,
        period: `${days} days`,
      };
    } catch (error) {
      logger.error('Failed to get user usage stats:', error);
      throw createError('Failed to get usage statistics', 500);
    }
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(conversationId: string, userId: string, title: string) {
    try {
      const conversation = await db.prisma.lLMConversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw createError('Conversation not found', 404);
      }

      const updated = await db.prisma.lLMConversation.update({
        where: { id: conversationId },
        data: { title, updatedAt: new Date() },
      });

      return updated;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      logger.error('Failed to update conversation title:', error);
      throw createError('Failed to update conversation title', 500);
    }
  }
}

export const llmService = new LLMService();
export default llmService;