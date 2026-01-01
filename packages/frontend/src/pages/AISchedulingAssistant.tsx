import React, { useState } from 'react';
import { Search, Sparkles, TrendingUp, Users, Calendar, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';

interface SchedulingSuggestion {
  id: string;
  suggestedProviderId: string;
  providerName: string;
  suggestedDate: Date;
  suggestedTime: string;
  suggestedDuration: number;
  alternativeSlots: TimeSlot[];
  compatibilityScore: number;
  loadBalanceScore: number;
  efficiencyScore: number;
  overallScore: number;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
}

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  providerId: string;
  providerName: string;
}

interface AISchedulingStats {
  totalSuggestions: number;
  acceptedSuggestions: number;
  acceptanceRate: string;
  averageScore: string;
  topSuggestedProviders: Array<{
    provider: {
      id: string;
      firstName: string;
      lastName: string;
      title: string;
    };
    suggestionCount: number;
  }>;
}

type AITab = 'suggestions' | 'compatibility' | 'load-balancing' | 'patterns';

export default function AISchedulingAssistant() {
  const [nlpInput, setNlpInput] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<AITab>('suggestions');
  const [acceptConfirm, setAcceptConfirm] = useState<{ isOpen: boolean; suggestionId: string }>({
    isOpen: false,
    suggestionId: ''
  });
  const queryClient = useQueryClient();

  // Fetch AI scheduling statistics
  const { data: stats } = useQuery<{ stats: AISchedulingStats }>({
    queryKey: ['ai-scheduling-stats'],
    queryFn: async () => {
      const response = await api.get('/ai-scheduling/stats');
      return response.data;
    }
  });

  // Parse NLP input mutation
  const parseMutation = useMutation({
    mutationFn: async (requestText: string) => {
      const response = await api.post('/ai-scheduling/nlp/parse', { requestText });
      return response.data;
    },
    onSuccess: (data) => {
      setParseResult(data);
    }
  });

  // Execute NLP request mutation
  const executeMutation = useMutation({
    mutationFn: async (requestText: string) => {
      const response = await api.post('/ai-scheduling/nlp/execute', { requestText });
      return response.data;
    },
    onSuccess: (data) => {
      setSuggestions(data.result || []);
      setParseResult(data.parseResult);
    }
  });

  // Accept suggestion mutation
  const acceptMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const response = await api.post(`/ai-scheduling/suggest/${suggestionId}/accept`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-scheduling-stats'] });
      setSuggestions([]);
      setNlpInput('');
      setParseResult(null);
    }
  });

  const handleParse = () => {
    if (nlpInput.trim()) {
      parseMutation.mutate(nlpInput);
    }
  };

  const handleExecute = () => {
    if (nlpInput.trim()) {
      executeMutation.mutate(nlpInput);
    }
  };

  const handleAcceptClick = (suggestionId: string) => {
    setAcceptConfirm({ isOpen: true, suggestionId });
  };

  const confirmAccept = () => {
    acceptMutation.mutate(acceptConfirm.suggestionId);
    setAcceptConfirm({ isOpen: false, suggestionId: '' });
  };

  const getConfidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatScore = (score: number) => {
    return `${(score * 100).toFixed(0)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Scheduling Assistant</h1>
          </div>
          <p className="text-gray-600">
            Use natural language to find optimal appointment slots, check availability, and get
            AI-powered scheduling suggestions.
          </p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Suggestions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.stats.totalSuggestions}
                  </p>
                </div>
                <Calendar className="w-10 h-10 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Accepted</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.stats.acceptedSuggestions}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Acceptance Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.stats.acceptanceRate}</p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.stats.averageScore}</p>
                </div>
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" role="tablist" aria-label="AI Features">
              <button
                role="tab"
                aria-selected={activeTab === 'suggestions'}
                aria-controls="suggestions-panel"
                onClick={() => setActiveTab('suggestions')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'suggestions'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Suggestions</span>
                </div>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'compatibility'}
                aria-controls="compatibility-panel"
                onClick={() => setActiveTab('compatibility')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'compatibility'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Compatibility</span>
                </div>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'load-balancing'}
                aria-controls="load-balancing-panel"
                onClick={() => setActiveTab('load-balancing')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'load-balancing'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Load Balancing</span>
                </div>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'patterns'}
                aria-controls="patterns-panel"
                onClick={() => setActiveTab('patterns')}
                className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'patterns'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>Patterns</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'suggestions' && (
          <div id="suggestions-panel" role="tabpanel" aria-labelledby="suggestions-tab">
            {/* Natural Language Input */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Natural Language Scheduling Request
            </label>
            <div className="relative">
              <textarea
                value={nlpInput}
                onChange={(e) => setNlpInput(e.target.value)}
                placeholder='Try: "Schedule an appointment with Dr. Smith tomorrow at 2pm" or "Find me an available slot next Tuesday afternoon"'
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {nlpInput.length}/500
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleParse}
              disabled={!nlpInput.trim() || parseMutation.isPending}
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              {parseMutation.isPending ? 'Parsing...' : 'Parse Only'}
            </button>
            <button
              onClick={handleExecute}
              disabled={!nlpInput.trim() || executeMutation.isPending}
              className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              {executeMutation.isPending ? 'Processing...' : 'Find Slots'}
            </button>
          </div>

          {/* Example Requests */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Example requests:</p>
            <div className="space-y-1">
              {[
                'Schedule an appointment with Dr. Smith tomorrow at 2pm',
                'Find me an available slot next Tuesday afternoon',
                'Book a follow-up session for next week',
                'When is Dr. Johnson available on Friday?'
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setNlpInput(example)}
                  className="block text-sm text-blue-700 hover:text-blue-900 hover:underline"
                >
                  • {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Parse Result */}
        {parseResult && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Parse Result</h2>

            <div className="space-y-4">
              {/* Confidence and Intent */}
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Confidence: </span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatScore(parseResult.confidence)}
                  </span>
                </div>
                {parseResult.intent && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Intent: </span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
                      {parseResult.intent}
                    </span>
                  </div>
                )}
              </div>

              {/* Extracted Entities */}
              {parseResult.entities && Object.keys(parseResult.entities).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Extracted Information:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {parseResult.entities.providerName && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Provider</p>
                        <p className="text-sm font-medium text-gray-900">
                          {parseResult.entities.providerName}
                        </p>
                      </div>
                    )}
                    {parseResult.entities.dateText && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {parseResult.entities.dateText}
                        </p>
                      </div>
                    )}
                    {parseResult.entities.time && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="text-sm font-medium text-gray-900">
                          {parseResult.entities.time}
                        </p>
                      </div>
                    )}
                    {parseResult.entities.timeOfDay && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Time of Day</p>
                        <p className="text-sm font-medium text-gray-900">
                          {parseResult.entities.timeOfDay}
                        </p>
                      </div>
                    )}
                    {parseResult.entities.duration && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-sm font-medium text-gray-900">
                          {parseResult.entities.duration} min
                        </p>
                      </div>
                    )}
                    {parseResult.entities.flexibility && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Flexibility</p>
                        <p className="text-sm font-medium text-gray-900">
                          {parseResult.entities.flexibility} days
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              {parseResult.reasoning && parseResult.reasoning.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Reasoning:</h3>
                  <ul className="space-y-1">
                    {parseResult.reasoning.map((reason: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-indigo-600 mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clarification Needed */}
              {parseResult.clarificationNeeded && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    Clarification needed: {parseResult.clarificationNeeded}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">AI-Powered Suggestions</h2>

            {suggestions.map((suggestion, index) => (
              <div key={suggestion.id || index} className="bg-white rounded-lg shadow-lg p-6">
                {/* Suggestion Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {suggestion.providerName}
                      </h3>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getConfidenceBadgeColor(
                          suggestion.confidenceLevel
                        )}`}
                      >
                        {suggestion.confidenceLevel} CONFIDENCE
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(suggestion.suggestedDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {suggestion.suggestedTime} ({suggestion.suggestedDuration} min)
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">Overall Score</p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {formatScore(suggestion.overallScore)}
                    </p>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium mb-1">Compatibility</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-purple-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${suggestion.compatibilityScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-purple-900">
                        {formatScore(suggestion.compatibilityScore)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Load Balance</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${suggestion.loadBalanceScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-blue-900">
                        {formatScore(suggestion.loadBalanceScore)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">Efficiency</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-green-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${suggestion.efficiencyScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-green-900">
                        {formatScore(suggestion.efficiencyScore)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">{suggestion.reasoning}</p>
                </div>

                {/* Alternative Slots */}
                {suggestion.alternativeSlots && suggestion.alternativeSlots.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Alternative Slots:</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {suggestion.alternativeSlots.slice(0, 5).map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex-shrink-0 p-3 bg-gray-50 border border-gray-200 rounded-lg min-w-[150px]"
                        >
                          <p className="text-xs text-gray-600">
                            {new Date(slot.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {slot.startTime} - {slot.endTime}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accept Button */}
                <button
                  onClick={() => handleAcceptClick(suggestion.id)}
                  disabled={acceptMutation.isPending}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {acceptMutation.isPending ? 'Creating Appointment...' : 'Accept & Create Appointment'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!parseResult && suggestions.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Sparkles className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Start with Natural Language
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Type a scheduling request in plain English above, and our AI will understand your
              intent and find the best available slots.
            </p>
          </div>
        )}
          </div>
        )}

        {/* Compatibility Tab */}
        {activeTab === 'compatibility' && (
          <div id="compatibility-panel" role="tabpanel" aria-labelledby="compatibility-tab">
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <Users className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Provider-Client Compatibility Analysis
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                This feature analyzes provider-client compatibility using 7 key factors including
                specializations, availability patterns, treatment history, and preferences to ensure
                optimal therapeutic matches.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Specialization Match</h4>
                  <p className="text-sm text-purple-700">
                    Matches client needs with provider expertise and treatment modalities
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Historical Success</h4>
                  <p className="text-sm text-purple-700">
                    Analyzes treatment outcomes and client satisfaction patterns
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Preference Alignment</h4>
                  <p className="text-sm text-purple-700">
                    Considers schedule preferences and communication styles
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Load Balancing Tab */}
        {activeTab === 'load-balancing' && (
          <div id="load-balancing-panel" role="tabpanel" aria-labelledby="load-balancing-tab">
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <TrendingUp className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Intelligent Load Balancing
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                Distributes appointments evenly across providers to prevent burnout, optimize
                utilization, and maintain service quality through intelligent workload analysis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Workload Distribution</h4>
                  <p className="text-sm text-blue-700">
                    Balances appointments across providers based on capacity and current load
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Utilization Optimization</h4>
                  <p className="text-sm text-blue-700">
                    Maximizes provider availability while preventing scheduling conflicts
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Burnout Prevention</h4>
                  <p className="text-sm text-blue-700">
                    Monitors workload patterns to maintain sustainable scheduling
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div id="patterns-panel" role="tabpanel" aria-labelledby="patterns-tab">
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <Calendar className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Scheduling Pattern Recognition
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                Learns from historical scheduling data to identify trends, predict optimal times,
                and proactively suggest improvements to scheduling efficiency.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Time Preferences</h4>
                  <p className="text-sm text-green-700">
                    Identifies preferred scheduling times for clients and providers
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Frequency Patterns</h4>
                  <p className="text-sm text-green-700">
                    Tracks appointment frequency to suggest optimal follow-up timing
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Success Metrics</h4>
                  <p className="text-sm text-green-700">
                    Analyzes no-show rates and satisfaction to improve future scheduling
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accept Suggestion Confirmation Modal */}
        <ConfirmModal
          isOpen={acceptConfirm.isOpen}
          onClose={() => setAcceptConfirm({ isOpen: false, suggestionId: '' })}
          onConfirm={confirmAccept}
          title="Accept Scheduling Suggestion"
          message="Accept this scheduling suggestion and create the appointment?"
          confirmText="Accept & Create"
          confirmVariant="primary"
        />
      </div>
    </div>
  );
}
