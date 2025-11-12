import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
  Shield,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { useCredential, useCredentialTimeline } from '../../hooks/useCredentialing';

interface TimelineEvent {
  id: string;
  type: 'ADDED' | 'VERIFIED' | 'RENEWED' | 'EXPIRED' | 'UPDATED' | 'FLAGGED';
  timestamp: string;
  performedBy: string;
  description: string;
  details?: string;
}

export default function CredentialTimeline() {
  const { id } = useParams();
  const { data: credential } = useCredential(id || '');
  const { data: timeline, isLoading } = useCredentialTimeline(id || '');

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState('');

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Filter timeline events
  const filteredEvents = timeline?.filter((event: TimelineEvent) => {
    if (!filterType) return true;
    return event.type === filterType;
  }) || [];

  const getEventConfig = (type: string) => {
    const configs = {
      ADDED: {
        icon: <Plus className="w-6 h-6 text-white" />,
        bg: 'from-blue-600 to-blue-700',
        border: 'border-blue-200',
        title: 'Credential Added',
        color: 'text-blue-600',
      },
      VERIFIED: {
        icon: <CheckCircle className="w-6 h-6 text-white" />,
        bg: 'from-green-600 to-green-700',
        border: 'border-green-200',
        title: 'Verified',
        color: 'text-green-600',
      },
      RENEWED: {
        icon: <RefreshCw className="w-6 h-6 text-white" />,
        bg: 'from-purple-600 to-purple-700',
        border: 'border-purple-200',
        title: 'Renewed',
        color: 'text-purple-600',
      },
      EXPIRED: {
        icon: <XCircle className="w-6 h-6 text-white" />,
        bg: 'from-red-600 to-red-700',
        border: 'border-red-200',
        title: 'Expired',
        color: 'text-red-600',
      },
      UPDATED: {
        icon: <FileText className="w-6 h-6 text-white" />,
        bg: 'from-yellow-600 to-yellow-700',
        border: 'border-yellow-200',
        title: 'Updated',
        color: 'text-yellow-600',
      },
      FLAGGED: {
        icon: <AlertTriangle className="w-6 h-6 text-white" />,
        bg: 'from-orange-600 to-orange-700',
        border: 'border-orange-200',
        title: 'Flagged',
        color: 'text-orange-600',
      },
    };

    return configs[type as keyof typeof configs] || configs.ADDED;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <Clock className="w-12 h-12 text-purple-600 mr-4" />
          Credential Timeline
        </h1>
        <p className="text-gray-600 text-lg">
          Complete history of credential events and changes
        </p>
        {credential && (
          <div className="mt-4 p-4 bg-white rounded-xl border-2 border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{credential.staffName}</p>
                <p className="text-sm text-gray-600">
                  {credential.type} • {credential.credentialNumber}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-6 h-6 text-gray-600" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 transition-all appearance-none bg-white"
          >
            <option value="">All Events</option>
            <option value="ADDED">Added</option>
            <option value="VERIFIED">Verified</option>
            <option value="RENEWED">Renewed</option>
            <option value="EXPIRED">Expired</option>
            <option value="UPDATED">Updated</option>
            <option value="FLAGGED">Flagged</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-900">Loading timeline...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-900 mb-2">No events found</p>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-200 via-blue-200 to-indigo-200" />

            {/* Events */}
            <div className="space-y-8">
              {filteredEvents.map((event: TimelineEvent, index: number) => (
                <TimelineEventCard
                  key={event.id}
                  event={event}
                  isExpanded={expandedEvents.has(event.id)}
                  onToggle={() => toggleEvent(event.id)}
                  isLast={index === filteredEvents.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
        <EventStat
          icon={<Plus className="w-5 h-5 text-blue-600" />}
          label="Added"
          count={timeline?.filter((e: TimelineEvent) => e.type === 'ADDED').length || 0}
          color="blue"
        />
        <EventStat
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          label="Verified"
          count={timeline?.filter((e: TimelineEvent) => e.type === 'VERIFIED').length || 0}
          color="green"
        />
        <EventStat
          icon={<RefreshCw className="w-5 h-5 text-purple-600" />}
          label="Renewed"
          count={timeline?.filter((e: TimelineEvent) => e.type === 'RENEWED').length || 0}
          color="purple"
        />
        <EventStat
          icon={<XCircle className="w-5 h-5 text-red-600" />}
          label="Expired"
          count={timeline?.filter((e: TimelineEvent) => e.type === 'EXPIRED').length || 0}
          color="red"
        />
        <EventStat
          icon={<FileText className="w-5 h-5 text-yellow-600" />}
          label="Updated"
          count={timeline?.filter((e: TimelineEvent) => e.type === 'UPDATED').length || 0}
          color="yellow"
        />
        <EventStat
          icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
          label="Flagged"
          count={timeline?.filter((e: TimelineEvent) => e.type === 'FLAGGED').length || 0}
          color="orange"
        />
      </div>
    </div>
  );
}

// Timeline Event Card Component
interface TimelineEventCardProps {
  event: TimelineEvent;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}

function TimelineEventCard({ event, isExpanded, onToggle, isLast }: TimelineEventCardProps) {
  const config = getEventConfig(event.type);

  return (
    <div className="relative pl-20">
      {/* Event Icon */}
      <div className={`absolute left-0 w-16 h-16 bg-gradient-to-br ${config.bg} rounded-full flex items-center justify-center shadow-lg border-4 border-white z-10`}>
        {config.icon}
      </div>

      {/* Event Card */}
      <div className={`bg-white border-2 ${config.border} rounded-xl p-6 hover:shadow-lg transition-all`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className={`text-xl font-bold ${config.color} mb-1`}>
              {config.title}
            </h3>
            <p className="text-gray-900 font-bold">{event.description}</p>
          </div>
          {event.details && (
            <button
              onClick={onToggle}
              className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(event.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{event.performedBy}</span>
          </div>
        </div>

        {/* Expandable Details */}
        {isExpanded && event.details && (
          <div className="mt-4 pt-4 border-t-2 border-gray-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.details}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Event Stat Component
interface EventStatProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'orange';
}

function EventStat({ icon, label, count, color }: EventStatProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  return (
    <div className={`${colorClasses[color]} border-2 rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{count}</p>
    </div>
  );
}

function getEventConfig(type: string) {
  const configs = {
    ADDED: {
      icon: <Plus className="w-6 h-6 text-white" />,
      bg: 'from-blue-600 to-blue-700',
      border: 'border-blue-200',
      title: 'Credential Added',
      color: 'text-blue-600',
    },
    VERIFIED: {
      icon: <CheckCircle className="w-6 h-6 text-white" />,
      bg: 'from-green-600 to-green-700',
      border: 'border-green-200',
      title: 'Verified',
      color: 'text-green-600',
    },
    RENEWED: {
      icon: <RefreshCw className="w-6 h-6 text-white" />,
      bg: 'from-purple-600 to-purple-700',
      border: 'border-purple-200',
      title: 'Renewed',
      color: 'text-purple-600',
    },
    EXPIRED: {
      icon: <XCircle className="w-6 h-6 text-white" />,
      bg: 'from-red-600 to-red-700',
      border: 'border-red-200',
      title: 'Expired',
      color: 'text-red-600',
    },
    UPDATED: {
      icon: <FileText className="w-6 h-6 text-white" />,
      bg: 'from-yellow-600 to-yellow-700',
      border: 'border-yellow-200',
      title: 'Updated',
      color: 'text-yellow-600',
    },
    FLAGGED: {
      icon: <AlertTriangle className="w-6 h-6 text-white" />,
      bg: 'from-orange-600 to-orange-700',
      border: 'border-orange-200',
      title: 'Flagged',
      color: 'text-orange-600',
    },
  };

  return configs[type as keyof typeof configs] || configs.ADDED;
}
