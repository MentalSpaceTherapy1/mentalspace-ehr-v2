import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Plus,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Trash2,
  Edit,
} from 'lucide-react';
import { useOnboardingChecklist, useOnboarding } from '../../hooks/useOnboarding';

const OnboardingChecklist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { checklist, loading, toggleChecklistItem, addChecklistItem, updateChecklistItem } =
    useOnboardingChecklist(id || '');
  const { getOnboardingById } = useOnboarding();
  const [onboarding, setOnboarding] = useState<any>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newItem, setNewItem] = useState({
    category: 'HR',
    itemName: '',
    description: '',
    dueDate: '',
    isRequired: true,
    notes: '',
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

  const categories = Array.from(new Set(checklist.map((item) => item.category)));
  const filteredChecklist =
    selectedCategory === 'all'
      ? checklist
      : checklist.filter((item) => item.category === selectedCategory);

  const completedCount = checklist.filter((item) => item.isCompleted).length;
  const totalCount = checklist.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const overdueItems = checklist.filter((item) => {
    if (!item.dueDate || item.isCompleted) return false;
    return new Date(item.dueDate) < new Date();
  });

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    await toggleChecklistItem(itemId, !currentStatus);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await addChecklistItem({
      ...newItem,
      order: checklist.length,
    });
    setNewItem({
      category: 'HR',
      itemName: '',
      description: '',
      dueDate: '',
      isRequired: true,
      notes: '',
    });
    setShowAddItem(false);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      HR: 'bg-blue-100 text-blue-700',
      IT: 'bg-purple-100 text-purple-700',
      Training: 'bg-green-100 text-green-700',
      Compliance: 'bg-red-100 text-red-700',
      Team: 'bg-yellow-100 text-yellow-700',
      Admin: 'bg-indigo-100 text-indigo-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as { [key: string]: typeof checklist });

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {onboarding.staff?.firstName} {onboarding.staff?.lastName}
              </h1>
              <p className="text-gray-600">{onboarding.staff?.title}</p>
              <p className="text-sm text-gray-500 mt-1">
                Started: {new Date(onboarding.startDate).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-gray-900">
                {completedCount} / {totalCount} tasks
              </span>
            </div>
            <div className="relative h-10 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-full ${
                  progressPercentage >= 80
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                    : progressPercentage >= 50
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                    : progressPercentage >= 25
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-r from-red-500 to-pink-600'
                }`}
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">{progressPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Overdue Items Alert */}
          {overdueItems.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {overdueItems.length} overdue {overdueItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add Item Form */}
      {showAddItem && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Checklist Item</h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Training">Training</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Team">Team</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItem.itemName}
                  onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Complete I-9 Form"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Additional details..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={newItem.dueDate}
                  onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="required"
                  checked={newItem.isRequired}
                  onChange={(e) => setNewItem({ ...newItem, isRequired: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="required" className="text-sm font-medium text-gray-700">
                  Required item
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Item
              </button>
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({checklist.length})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category} ({checklist.filter((item) => item.category === category).length})
            </button>
          ))}
        </div>
      </div>

      {/* Checklist Items */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : selectedCategory === 'all' ? (
        <div className="space-y-6">
          {Object.entries(groupedChecklist).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getCategoryColor(category)}`}>
                  {category}
                </span>
                <span className="text-sm text-gray-500">
                  {items.filter((i) => i.isCompleted).length} / {items.length} completed
                </span>
              </div>
              <div className="space-y-3">
                {items
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`border-2 rounded-xl p-4 transition-all ${
                        item.isCompleted
                          ? 'border-green-200 bg-green-50'
                          : item.dueDate && new Date(item.dueDate) < new Date()
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => handleToggleItem(item.id, item.isCompleted)}
                          className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            item.isCompleted
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          {item.isCompleted && <Check className="w-4 h-4 text-white" />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className={`font-semibold ${
                                item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                              }`}
                            >
                              {item.itemName}
                            </h3>
                            {item.isRequired && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                                Required
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {item.dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                                {!item.isCompleted && new Date(item.dueDate) < new Date() && (
                                  <span className="text-red-600 font-medium ml-1">(Overdue)</span>
                                )}
                              </div>
                            )}
                            {item.completedDate && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                <span>
                                  Completed: {new Date(item.completedDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          {item.notes && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-700">{item.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="space-y-3">
            {filteredChecklist
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <div
                  key={item.id}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    item.isCompleted
                      ? 'border-green-200 bg-green-50'
                      : item.dueDate && new Date(item.dueDate) < new Date()
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggleItem(item.id, item.isCompleted)}
                      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        item.isCompleted
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {item.isCompleted && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-semibold ${
                            item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}
                        >
                          {item.itemName}
                        </h3>
                        {item.isRequired && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                            Required
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {item.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                            {!item.isCompleted && new Date(item.dueDate) < new Date() && (
                              <span className="text-red-600 font-medium ml-1">(Overdue)</span>
                            )}
                          </div>
                        )}
                        {item.completedDate && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>
                              Completed: {new Date(item.completedDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {item.notes && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-700">{item.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && checklist.length === 0 && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No checklist items yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding the first item</p>
          <button
            onClick={() => setShowAddItem(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add First Item
          </button>
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;
