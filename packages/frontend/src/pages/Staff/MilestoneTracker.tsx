import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  Target,
  Trophy,
  Sparkles,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useOnboardingMilestones, useOnboarding } from '../../hooks/useOnboarding';
import confetti from 'canvas-confetti';

const MilestoneTracker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { milestones, loading, completeMilestone, addMilestone } = useOnboardingMilestones(
    id || ''
  );
  const { getOnboardingById } = useOnboarding();
  const [onboarding, setOnboarding] = useState<any>(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [newMilestone, setNewMilestone] = useState({
    milestoneName: '',
    milestoneType: 'CUSTOM' as const,
    scheduledDate: '',
    description: '',
  });

  useEffect(() => {
    const fetchOnboarding = async () => {
      if (id) {
        const data = await getOnboardingById(id);
        setOnboarding(data);
      }
    };
    fetchOnboarding();
  }, [id]);

  const triggerCelebration = () => {
    // Confetti animation
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50;

      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2,
        },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#4169E1', '#32CD32'],
      });
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2,
        },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#4169E1', '#32CD32'],
      });
    }, 250);
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    const success = await completeMilestone(milestoneId);
    if (success) {
      triggerCelebration();
      setTimeout(() => {
        setSelectedMilestone(null);
      }, 3000);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMilestone(newMilestone);
    setNewMilestone({
      milestoneName: '',
      milestoneType: 'CUSTOM',
      scheduledDate: '',
      description: '',
    });
    setShowAddMilestone(false);
  };

  const getMilestoneIcon = (type: string, status: string) => {
    if (status === 'COMPLETED') {
      return <Trophy className="w-8 h-8 text-yellow-500" />;
    }
    switch (type) {
      case 'DAY_1':
        return <Target className="w-8 h-8 text-blue-500" />;
      case 'WEEK_1':
        return <Calendar className="w-8 h-8 text-purple-500" />;
      case 'DAY_30':
        return <Star className="w-8 h-8 text-yellow-500" />;
      case 'DAY_60':
        return <Sparkles className="w-8 h-8 text-pink-500" />;
      case 'DAY_90':
        return <Trophy className="w-8 h-8 text-green-500" />;
      default:
        return <CheckCircle className="w-8 h-8 text-gray-500" />;
    }
  };

  const getMilestoneColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'from-green-500 to-emerald-600';
      case 'IN_PROGRESS':
        return 'from-blue-500 to-indigo-600';
      case 'UPCOMING':
        return 'from-gray-400 to-gray-500';
      case 'MISSED':
        return 'from-red-500 to-pink-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'UPCOMING':
        return <Calendar className="w-5 h-5 text-gray-600" />;
      case 'MISSED':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const sortedMilestones = [...milestones].sort((a, b) => {
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  const upcomingMilestones = sortedMilestones.filter((m) => m.status === 'UPCOMING');
  const missedMilestones = sortedMilestones.filter((m) => m.status === 'MISSED');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/onboarding')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      {/* Header Card */}
      {onboarding && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl shadow-lg">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                Milestone Tracker
              </h1>
              <p className="text-gray-600 text-lg">
                {onboarding.staff?.firstName} {onboarding.staff?.lastName}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {onboarding.staff?.title} • Started:{' '}
                {new Date(onboarding.startDate).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => setShowAddMilestone(!showAddMilestone)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Milestone
            </button>
          </div>
        </div>
      )}

      {/* Add Milestone Form */}
      {showAddMilestone && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Custom Milestone</h2>
          <form onSubmit={handleAddMilestone} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Milestone Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMilestone.milestoneName}
                  onChange={(e) =>
                    setNewMilestone({ ...newMilestone, milestoneName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Complete First Client Session"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newMilestone.scheduledDate}
                  onChange={(e) =>
                    setNewMilestone({ ...newMilestone, scheduledDate: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Milestone details and expectations..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Milestone
              </button>
              <button
                type="button"
                onClick={() => setShowAddMilestone(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold mt-1">
                {milestones.filter((m) => m.status === 'COMPLETED').length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">In Progress</p>
              <p className="text-3xl font-bold mt-1">
                {milestones.filter((m) => m.status === 'IN_PROGRESS').length}
              </p>
            </div>
            <Clock className="w-12 h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm font-medium">Upcoming</p>
              <p className="text-3xl font-bold mt-1">{upcomingMilestones.length}</p>
            </div>
            <Calendar className="w-12 h-12 text-gray-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Missed</p>
              <p className="text-3xl font-bold mt-1">{missedMilestones.length}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {missedMilestones.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Missed Milestones</h3>
              <p className="text-sm text-red-700">
                {missedMilestones.length} milestone{missedMilestones.length !== 1 ? 's' : ''}{' '}
                require attention
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
            <Target className="w-7 h-7 text-blue-600" />
            Milestone Timeline
          </h2>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200"></div>

            {/* Milestones */}
            <div className="space-y-8">
              {sortedMilestones.map((milestone, index) => (
                <div key={milestone.id} className="relative pl-20">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute left-0 w-16 h-16 rounded-full bg-gradient-to-br ${getMilestoneColor(
                      milestone.status
                    )} shadow-lg flex items-center justify-center border-4 border-white`}
                  >
                    {getMilestoneIcon(milestone.milestoneType, milestone.status)}
                  </div>

                  {/* Milestone Card */}
                  <div
                    onClick={() => setSelectedMilestone(milestone)}
                    className={`cursor-pointer transition-all duration-300 transform hover:scale-102 ${
                      milestone.status === 'MISSED'
                        ? 'bg-red-50 border-2 border-red-200'
                        : milestone.status === 'COMPLETED'
                        ? 'bg-green-50 border-2 border-green-200'
                        : 'bg-white border-2 border-gray-200 hover:border-blue-300'
                    } rounded-xl p-6 shadow-md hover:shadow-xl`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3
                            className={`text-xl font-bold ${
                              milestone.status === 'COMPLETED'
                                ? 'text-green-900'
                                : milestone.status === 'MISSED'
                                ? 'text-red-900'
                                : 'text-gray-900'
                            }`}
                          >
                            {milestone.milestoneName}
                          </h3>
                          {getMilestoneStatusIcon(milestone.status)}
                        </div>
                        <p className="text-sm text-gray-600">{milestone.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Scheduled: {new Date(milestone.scheduledDate).toLocaleDateString()}
                        </span>
                      </div>
                      {milestone.completedDate && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {milestone.status !== 'COMPLETED' && milestone.status !== 'MISSED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteMilestone(milestone.id);
                        }}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {milestones.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No milestones yet</h3>
              <p className="text-gray-600 mb-6">Add milestones to track onboarding progress</p>
              <button
                onClick={() => setShowAddMilestone(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
              >
                <Plus className="w-5 h-5" />
                Add First Milestone
              </button>
            </div>
          )}
        </div>
      )}

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50"
          onClick={() => setSelectedMilestone(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${getMilestoneColor(
                    selectedMilestone.status
                  )} shadow-lg flex items-center justify-center`}
                >
                  {getMilestoneIcon(selectedMilestone.milestoneType, selectedMilestone.status)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedMilestone.milestoneName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getMilestoneStatusIcon(selectedMilestone.status)}
                    <span className="text-sm font-medium text-gray-600">
                      {selectedMilestone.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-gray-900">{selectedMilestone.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Scheduled Date</h3>
                  <p className="text-gray-900">
                    {new Date(selectedMilestone.scheduledDate).toLocaleDateString()}
                  </p>
                </div>
                {selectedMilestone.completedDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Completed Date</h3>
                    <p className="text-green-600 font-medium">
                      {new Date(selectedMilestone.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedMilestone.checklist && selectedMilestone.checklist.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Checklist</h3>
                  <ul className="space-y-2">
                    {selectedMilestone.checklist.map((item: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {selectedMilestone.status !== 'COMPLETED' && (
              <button
                onClick={() => {
                  handleCompleteMilestone(selectedMilestone.id);
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneTracker;
