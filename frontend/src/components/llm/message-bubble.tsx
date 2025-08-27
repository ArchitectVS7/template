import { cn } from '../../lib/utils';
import type { LLMMessage } from '../../types/llm';
import { Card } from '../ui/card';

interface MessageBubbleProps {
  message: LLMMessage;
  isStreaming?: boolean;
  className?: string;
}

export function MessageBubble({ message, isStreaming = false, className }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start",
      className
    )}>
      <Card className={cn(
        "max-w-[80%] px-4 py-3",
        isUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900",
        isStreaming && "animate-pulse"
      )}>
        <div className="space-y-2">
          {/* Message content */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse">|</span>
            )}
          </div>
          
          {/* Message metadata */}
          {!isUser && message.tokens > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
              <span>
                Tokens: {message.tokens.toLocaleString()}
              </span>
              {message.cost > 0 && (
                <span>
                  Cost: ${message.cost.toFixed(4)}
                </span>
              )}
              <span>
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          
          {/* User message timestamp */}
          {isUser && (
            <div className="text-xs text-blue-200 text-right">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default MessageBubble;