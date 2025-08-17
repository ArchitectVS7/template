import { useState } from 'react';
import { cn } from '../../lib/utils';
import { LLMConversation } from '../../types/llm';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface ConversationListProps {
  conversations: LLMConversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  isLoading = false,
  className
}: ConversationListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(conversationId);
    try {
      await onDeleteConversation(conversationId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateTitle = (title: string | null, maxLength = 40) => {
    if (!title) return 'Untitled Conversation';
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button
            onClick={onNewConversation}
            disabled={isLoading}
            size="sm"
          >
            New Chat
          </Button>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="mb-2">No conversations yet</p>
            <p className="text-sm">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  "p-3 cursor-pointer transition-colors hover:bg-gray-50",
                  activeConversationId === conversation.id && "bg-blue-50 border-blue-200"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {truncateTitle(conversation.title)}
                    </h3>
                    <div className="mt-1 text-xs text-gray-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>{conversation.model}</span>
                        <span>{formatDate(conversation.updatedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>
                          {conversation._count?.messages || 0} messages
                        </span>
                        {conversation.totalCost > 0 && (
                          <span className="text-green-600">
                            ${conversation.totalCost.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(conversation.id, e)}
                    disabled={deletingId === conversation.id}
                    className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  >
                    {deletingId === conversation.id ? (
                      <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '×'
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      {conversations.length > 0 && (
        <div className="p-4 border-t text-xs text-gray-500">
          <div className="flex justify-between">
            <span>{conversations.length} conversations</span>
            <span>
              Total: ${conversations.reduce((sum, conv) => sum + conv.totalCost, 0).toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConversationList;