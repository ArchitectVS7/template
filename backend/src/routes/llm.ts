import express, { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { llmService } from '../services/llm';
import { logger } from '../utils/logger';

const router = express.Router();

// Rate limiting for LLM endpoints
const llmRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many LLM requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 chat messages per minute
  message: 'Too many chat messages, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and authentication to all routes
router.use(llmRateLimit);
router.use(authenticateToken);

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    return next(createError(`Validation error: ${errorMessages}`, 400));
  }
  next();
};

/**
 * POST /api/llm/conversations
 * Create a new conversation
 */
router.post(
  '/conversations',
  [
    body('title').optional().isString().isLength({ min: 1, max: 200 })
      .withMessage('Title must be a string between 1 and 200 characters'),
    body('model').optional().isString().isIn([
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20241022'
    ]).withMessage('Invalid model specified'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, model } = req.body;
      const userId = req.user!.id;

      const conversation = await llmService.createConversation(userId, title, model);

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/llm/conversations
 * Get user conversations
 */
router.get(
  '/conversations',
  [
    query('limit').optional().isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const conversations = await llmService.getUserConversations(userId, limit, offset);

      res.json({
        success: true,
        data: conversations,
        pagination: {
          limit,
          offset,
          total: conversations.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/llm/conversations/:conversationId
 * Get conversation with messages
 */
router.get(
  '/conversations/:conversationId',
  [
    param('conversationId').isString().isLength({ min: 1 })
      .withMessage('Conversation ID is required'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;

      const { conversation, messages } = await llmService.getConversationMessages(
        conversationId,
        userId
      );

      res.json({
        success: true,
        data: {
          conversation,
          messages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/llm/conversations/:conversationId/messages
 * Send a message in a conversation
 */
router.post(
  '/conversations/:conversationId/messages',
  chatRateLimit,
  [
    param('conversationId').isString().isLength({ min: 1 })
      .withMessage('Conversation ID is required'),
    body('content').isString().isLength({ min: 1, max: 10000 })
      .withMessage('Message content must be between 1 and 10000 characters'),
    body('temperature').optional().isFloat({ min: 0, max: 2 })
      .withMessage('Temperature must be between 0 and 2'),
    body('maxTokens').optional().isInt({ min: 1, max: 8192 })
      .withMessage('Max tokens must be between 1 and 8192'),
    body('systemPrompt').optional().isString().isLength({ max: 2000 })
      .withMessage('System prompt must be at most 2000 characters'),
    body('stream').optional().isBoolean()
      .withMessage('Stream must be a boolean'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const { content, temperature, maxTokens, systemPrompt, stream } = req.body;
      const userId = req.user!.id;

      const options = {
        temperature,
        maxTokens,
        systemPrompt,
      };

      if (stream) {
        // Set up SSE headers for streaming
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        let responseData: any;

        try {
          responseData = await llmService.sendStreamingMessage(
            conversationId,
            userId,
            content,
            options,
            (chunk: string) => {
              // Send chunk as SSE
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
            }
          );

          // Send completion event
          res.write(`data: ${JSON.stringify({ 
            type: 'complete', 
            conversationId: responseData.conversationId,
            messageId: responseData.messageId 
          })}\n\n`);
          
        } catch (streamError) {
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            error: streamError instanceof Error ? streamError.message : 'Stream failed' 
          })}\n\n`);
        }

        res.end();
      } else {
        // Regular non-streaming response
        const response = await llmService.sendMessage(
          conversationId,
          userId,
          content,
          options
        );

        res.json({
          success: true,
          data: response,
        });
      }
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      }
    }
  }
);

/**
 * PUT /api/llm/conversations/:conversationId
 * Update conversation (e.g., title)
 */
router.put(
  '/conversations/:conversationId',
  [
    param('conversationId').isString().isLength({ min: 1 })
      .withMessage('Conversation ID is required'),
    body('title').isString().isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const { title } = req.body;
      const userId = req.user!.id;

      const conversation = await llmService.updateConversationTitle(
        conversationId,
        userId,
        title
      );

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/llm/conversations/:conversationId
 * Delete a conversation
 */
router.delete(
  '/conversations/:conversationId',
  [
    param('conversationId').isString().isLength({ min: 1 })
      .withMessage('Conversation ID is required'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user!.id;

      await llmService.deleteConversation(conversationId, userId);

      res.json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/llm/usage
 * Get user usage statistics
 */
router.get(
  '/usage',
  [
    query('days').optional().isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string) || 30;

      const stats = await llmService.getUserUsageStats(userId, days);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/llm/models
 * Get available models
 */
router.get(
  '/models',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const models = [
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          description: 'Most capable model for complex tasks',
          inputCost: 15.00,
          outputCost: 75.00,
          maxTokens: 4096,
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          description: 'Balanced performance and speed',
          inputCost: 3.00,
          outputCost: 15.00,
          maxTokens: 4096,
        },
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet',
          description: 'Latest balanced model with improved capabilities',
          inputCost: 3.00,
          outputCost: 15.00,
          maxTokens: 8192,
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          description: 'Fastest model for simple tasks',
          inputCost: 0.25,
          outputCost: 1.25,
          maxTokens: 4096,
        },
      ];

      res.json({
        success: true,
        data: models,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;