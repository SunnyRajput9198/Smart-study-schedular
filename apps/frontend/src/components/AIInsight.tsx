// apps/frontend/src/components/AIInsights.tsx
'use client';

import { useEffect, useState } from 'react';
import apiClient from '../api/axios';

export default function AIInsights() {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/analytics/recommendations');
      setRecommendations(response.data.recommendations);
    } catch (err) {
      console.error("Failed to fetch AI insights:", err);
      setError("Could not load AI insights at this time.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-md mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">💡 AI Insights</h3>
        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="text-black hover:text-indigo-300 disabled:opacity-50"
          title="Get a new insight"
        >
          Refresh
        </button>
      </div>
      
      <div className="min-h-[60px] flex items-center">
        {isLoading ? (
          <p className="text-black animate-pulse">Generating personalized advice...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <p className="text-black italic">
            "{recommendations[0]}"
          </p>
        )}
      </div>
    </div>
  );
}