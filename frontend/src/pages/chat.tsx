import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  LLMModel, 
  LLMConversation, 
  LLMMessage, 
  ChatSettings 
} from '../types/llm';
import { llmApi, LLMAPIError } from '../lib/llm-api';
import { useAuth } from '../contexts/auth-context';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import ConversationList from '../components/llm/conversation-list';
import ChatInterface from '../components/llm/chat-interface';
import ModelSelection from '../components/llm/model-selection';
import CostTracker from '../components/llm/cost-tracker';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [models, setModels] = useState<LLMModel[]>([]);
  const [conversations, setConversations] = useState<LLMConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<LLMConversation | null>(null);
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [settings, setSettings] = useState<ChatSettings>({
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful AI assistant for developers.',
  });

  // Loading states
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        const modelsData = await llmApi.getModels();
        setModels(modelsData);
        
        // Update settings with first model if current model not found
        if (modelsData.length > 0 && !modelsData.find(m => m.id === settings.model)) {
          setSettings(prev => ({ ...prev, model: modelsData[0].id }));
        }
      } catch (err) {
        console.error('Failed to load models:', err);
        setError('Failed to load AI models');
      } finally {
        setIsLoadingModels(false);
      }
    };

    if (user) {
      loadModels();
    }
  }, [user, settings.model]);

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoadingConversations(true);
        const conversationsData = await llmApi.getConversations();
        setConversations(conversationsData);
        
        // Auto-select first conversation if available
        if (conversationsData.length > 0 && !activeConversation) {
          handleSelectConversation(conversationsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setIsLoadingConversations(false);
      }
    };

    if (user) {
      loadConversations();
    }
  }, [user]);

  const handleSelectConversation = async (conversationId: string) => {
    try {
      const { conversation, messages: conversationMessages } = 
        await llmApi.getConversation(conversationId);
      
      setActiveConversation(conversation);
      setMessages(conversationMessages);
      setSettings(prev => ({ ...prev, model: conversation.model }));
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    }
  };

  const handleNewConversation = async () => {
    try {
      setIsCreatingConversation(true);
      const conversation = await llmApi.createConversation({
        title: `New Chat ${new Date().toLocaleDateString()}`,
        model: settings.model,
      });
      
      // Add to conversations list
      setConversations(prev => [conversation, ...prev]);
      
      // Select the new conversation
      setActiveConversation(conversation);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError('Failed to create new conversation');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await llmApi.deleteConversation(conversationId);
      
      // Remove from list
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // Clear active conversation if it was deleted
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
        
        // Auto-select first remaining conversation
        const remaining = conversations.filter(c => c.id !== conversationId);
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  const handleConversationUpdate = (updatedConversation: LLMConversation) => {
    setActiveConversation(updatedConversation);
    setConversations(prev => 
      prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
    );
  };

  const handleMessagesUpdate = (updatedMessages: LLMMessage[]) => {
    setMessages(updatedMessages);
  };

  const resetError = () => setError(null);

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              variant="ghost"
              size="sm"
            >
              ☰
            </Button>
            <h1 className="text-xl font-semibold">AI Chat</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="sm"
            >
              ⚙️
            </Button>
            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={cn(
          "bg-white border-r transition-all duration-300",
          sidebarCollapsed ? "w-0" : "w-80"
        )}>
          {!sidebarCollapsed && (
            <div className="h-full flex flex-col">
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversation?.id}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={handleDeleteConversation}
                onNewConversation={handleNewConversation}
                isLoading={isLoadingConversations || isCreatingConversation}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatInterface
            conversation={activeConversation}
            messages={messages}
            settings={settings}
            onMessagesUpdate={handleMessagesUpdate}
            onConversationUpdate={handleConversationUpdate}
            className="flex-1"
          />
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 bg-white border-l">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Settings</h3>
                  <Button
                    onClick={() => setShowSettings(false)}
                    variant="ghost"
                    size="sm"
                  >
                    ×
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <ModelSelection
                  models={models}
                  settings={settings}
                  onSettingsChange={setSettings}
                  isLoading={isLoadingModels}
                />
                
                <CostTracker />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}