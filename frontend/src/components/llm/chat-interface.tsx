import { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { LLMMessage, LLMConversation, ChatSettings, StreamChunk } from '../../types/llm';
import { llmApi, LLMAPIError } from '../../lib/llm-api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import MessageBubble from './message-bubble';

interface ChatInterfaceProps {
  conversation: LLMConversation | null;
  messages: LLMMessage[];
  settings: ChatSettings;
  onMessagesUpdate: (messages: LLMMessage[]) => void;
  onConversationUpdate: (conversation: LLMConversation) => void;
  className?: string;
}

export function ChatInterface({
  conversation,
  messages,
  settings,
  onMessagesUpdate,
  onConversationUpdate,
  className
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<LLMMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const resetError = () => setError(null);

  const createStreamingMessage = (conversationId: string): LLMMessage => ({
    id: 'streaming-' + Date.now(),
    conversationId,
    role: 'assistant',
    content: '',
    tokens: 0,
    cost: 0,
    createdAt: new Date().toISOString(),
  });

  const addUserMessage = (content: string): LLMMessage => {
    const userMessage: LLMMessage = {
      id: 'user-' + Date.now(),
      conversationId: conversation!.id,
      role: 'user',
      content,
      tokens: 0,
      cost: 0,
      createdAt: new Date().toISOString(),
    };
    
    onMessagesUpdate([...messages, userMessage]);
    return userMessage;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !conversation || isLoading || isStreaming) return;

    const messageContent = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      // Add user message immediately
      addUserMessage(messageContent);

      // Start streaming response
      setIsStreaming(true);
      const streamingMsg = createStreamingMessage(conversation.id);
      setStreamingMessage(streamingMsg);

      await llmApi.sendStreamingMessage(
        conversation.id,
        {
          content: messageContent,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          systemPrompt: settings.systemPrompt,
        },
        (chunk: StreamChunk) => {
          if (chunk.type === 'chunk' && chunk.content) {
            setStreamingMessage(prev => prev ? {
              ...prev,
              content: prev.content + chunk.content
            } : null);
          }
        },
        async (data) => {
          // Streaming complete - fetch the final message and conversation
          try {
            const { conversation: updatedConv, messages: updatedMessages } = 
              await llmApi.getConversation(conversation.id);
            
            onConversationUpdate(updatedConv);
            onMessagesUpdate(updatedMessages);
            setStreamingMessage(null);
          } catch (err) {
            console.error('Failed to fetch updated conversation:', err);
            setError('Failed to update conversation');
          }
        },
        (errorMsg) => {
          setError(errorMsg);
          setStreamingMessage(null);
        }
      );
    } catch (err) {
      if (err instanceof LLMAPIError) {
        setError(err.message);
      } else {
        setError('Failed to send message');
      }
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const allMessages = [...messages];
  if (streamingMessage) {
    allMessages.push(streamingMessage);
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      {conversation && (
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {conversation.title || 'Untitled Conversation'}
              </h2>
              <p className="text-sm text-gray-600">
                Model: {conversation.model} • 
                Total cost: ${conversation.totalCost.toFixed(4)} • 
                {conversation.totalTokens.toLocaleString()} tokens
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!conversation ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-4">
              <div className="text-gray-400 text-6xl">💬</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Welcome to AI Chat
                </h3>
                <p className="text-gray-500">
                  Select a conversation or start a new one to begin chatting
                </p>
              </div>
            </div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-4">
              <div className="text-gray-400 text-4xl">🚀</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Start Your Conversation
                </h3>
                <p className="text-gray-500">
                  Type your first message below to begin
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {allMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={message.id === streamingMessage?.id && isStreaming}
              />
            ))}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b">
          <div className="flex items-center justify-between">
            <p className="text-red-600 text-sm">{error}</p>
            <Button
              onClick={resetError}
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      {conversation && (
        <div className="p-4 border-t bg-white">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isStreaming 
                  ? "AI is responding..." 
                  : "Type your message..."
              }
              disabled={isLoading || isStreaming}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || isStreaming}
            >
              {isLoading || isStreaming ? (
                <div className="w-4 h-4 border border-gray-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Send'
              )}
            </Button>
          </div>
          
          {/* Usage hint */}
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}

export default ChatInterface;