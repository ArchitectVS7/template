import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { LLMModel, ChatSettings } from '../../types/llm';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ModelSelectionProps {
  models: LLMModel[];
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  isLoading?: boolean;
  className?: string;
}

export function ModelSelection({
  models,
  settings,
  onSettingsChange,
  isLoading = false,
  className
}: ModelSelectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentModel = models.find(m => m.id === settings.model);

  const handleModelChange = (modelId: string) => {
    onSettingsChange({ ...settings, model: modelId });
    setIsOpen(false);
  };

  const handleSettingChange = (key: keyof ChatSettings, value: string | number) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}/1M tokens`;
  };

  const getModelBadgeColor = (modelId: string) => {
    if (modelId.includes('opus')) return 'bg-purple-100 text-purple-800';
    if (modelId.includes('sonnet')) return 'bg-blue-100 text-blue-800';
    if (modelId.includes('haiku')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Model Selection */}
      <div className="space-y-2">
        <Label>AI Model</Label>
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            disabled={isLoading || models.length === 0}
            className="w-full justify-between"
          >
            <div className="flex items-center space-x-2">
              {currentModel && (
                <span className={cn(
                  "px-2 py-1 text-xs rounded-full",
                  getModelBadgeColor(currentModel.id)
                )}>
                  {currentModel.name}
                </span>
              )}
              {!currentModel && <span>Select a model</span>}
            </div>
            <span>{isOpen ? '↑' : '↓'}</span>
          </Button>

          {isOpen && (
            <Card className="absolute top-full mt-1 w-full z-10 p-2 space-y-2">
              {models.map((model) => (
                <div
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={cn(
                    "p-3 rounded cursor-pointer hover:bg-gray-50 transition-colors",
                    settings.model === model.id && "bg-blue-50 border border-blue-200"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "px-2 py-1 text-xs rounded-full",
                          getModelBadgeColor(model.id)
                        )}>
                          {model.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {model.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Input: {formatCost(model.inputCost)}</span>
                        <span>Output: {formatCost(model.outputCost)}</span>
                        <span>Max: {model.maxTokens.toLocaleString()} tokens</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* Model Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="temperature">
            Temperature: {settings.temperature}
          </Label>
          <Input
            id="temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Focused</span>
            <span>Creative</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            min="1"
            max={currentModel?.maxTokens || 8192}
            value={settings.maxTokens}
            onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <textarea
          id="systemPrompt"
          value={settings.systemPrompt}
          onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
          placeholder="You are a helpful AI assistant..."
          className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Current Model Info */}
      {currentModel && (
        <Card className="p-3">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Selected Model:</span>
              <span className="font-medium">{currentModel.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Input Cost:</span>
              <span>{formatCost(currentModel.inputCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Output Cost:</span>
              <span>{formatCost(currentModel.outputCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Tokens:</span>
              <span>{currentModel.maxTokens.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ModelSelection;