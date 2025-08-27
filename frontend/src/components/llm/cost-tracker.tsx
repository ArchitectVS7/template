import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import type { UsageStats } from '../../types/llm';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { llmApi } from '../../lib/llm-api';

interface CostTrackerProps {
  className?: string;
}

export function CostTracker({ className }: CostTrackerProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(30);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await llmApi.getUsageStats(period);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getCostColor = (cost: number) => {
    if (cost < 0.01) return 'text-green-600';
    if (cost < 0.1) return 'text-yellow-600';
    if (cost < 1) return 'text-orange-600';
    return 'text-red-600';
  };

  const periodOptions = [
    { value: 1, label: '24 hours' },
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
  ];

  if (error) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load usage stats</p>
          <Button onClick={loadStats} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Usage & Costs</h3>
          <Button
            onClick={loadStats}
            disabled={isLoading}
            size="sm"
            variant="ghost"
          >
            ↻
          </Button>
        </div>

        {/* Period Selection */}
        <div className="flex space-x-1">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              size="sm"
              variant={period === option.value ? "default" : "ghost"}
              disabled={isLoading}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Stats Display */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Primary Cost Display */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={cn("text-2xl font-bold", getCostColor(stats.totalCost))}>
                {formatCurrency(stats.totalCost)}
              </div>
              <p className="text-sm text-gray-600">
                Total cost in {stats.period}
              </p>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {formatNumber(stats.totalConversations)}
                </div>
                <p className="text-xs text-gray-600">Conversations</p>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {formatNumber(stats.totalMessages)}
                </div>
                <p className="text-xs text-gray-600">Messages</p>
              </div>
              
              <div className="text-center col-span-2">
                <div className="text-lg font-semibold text-purple-600">
                  {formatNumber(stats.totalTokens)}
                </div>
                <p className="text-xs text-gray-600">Total Tokens</p>
              </div>
            </div>

            {/* Efficiency Metrics */}
            {stats.totalMessages > 0 && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg cost per message:</span>
                  <span className={cn("font-medium", getCostColor(stats.totalCost / stats.totalMessages))}>
                    {formatCurrency(stats.totalCost / stats.totalMessages)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg tokens per message:</span>
                  <span className="font-medium">
                    {Math.round(stats.totalTokens / stats.totalMessages)}
                  </span>
                </div>
              </div>
            )}

            {/* Cost Breakdown Estimate */}
            {stats.totalCost > 0 && (
              <div className="text-xs text-gray-500 border-t pt-3">
                <p className="mb-1">💡 <strong>Cost breakdown:</strong></p>
                <p>• Input tokens: ~{Math.round(stats.totalTokens * 0.4).toLocaleString()}</p>
                <p>• Output tokens: ~{Math.round(stats.totalTokens * 0.6).toLocaleString()}</p>
                <p className="mt-1">Costs may vary based on model selection</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            No usage data available
          </div>
        )}
      </div>
    </Card>
  );
}

export default CostTracker;