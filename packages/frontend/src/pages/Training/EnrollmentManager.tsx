import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  BookOpen,
  Plus,
  Search,
  Filter,
  Send,
  CheckCircle2,
  X,
  History,
  Settings,
} from 'lucide-react';
import { useBulkEnroll, useCourses } from '../../hooks/useTraining';

export default function EnrollmentManager() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [searchUsers, setSearchUsers] = useState('');
  const [searchCourses, setSearchCourses] = useState('');
  const [showAutoEnrollBuilder, setShowAutoEnrollBuilder] = useState(false);

  const { data: courses } = useCourses();
  const bulkEnrollMutation = useBulkEnroll();

  // Mock user data - replace with actual API call
  const users = [
    { id: '1', name: 'Dr. Sarah Johnson', role: 'Clinician', department: 'Mental Health' },
    { id: '2', name: 'Dr. Michael Chen', role: 'Clinician', department: 'Mental Health' },
    { id: '3', name: 'Lisa Anderson', role: 'Admin', department: 'Administration' },
    { id: '4', name: 'James Wilson', role: 'Supervisor', department: 'Mental Health' },
  ];

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleBulkEnroll = async () => {
    if (selectedUsers.length === 0 || selectedCourses.length === 0) {
      toast.error('Please select at least one user and one course');
      return;
    }

    try {
      await bulkEnrollMutation.mutateAsync({
        userIds: selectedUsers,
        courseIds: selectedCourses,
      });
      toast.success(`Successfully enrolled ${selectedUsers.length} users in ${selectedCourses.length} courses!`);
      setSelectedUsers([]);
      setSelectedCourses([]);
    } catch (error) {
      console.error('Error enrolling users:', error);
      toast.error('Failed to enroll users');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const filteredCourses = courses?.filter((course: any) =>
    course.title.toLowerCase().includes(searchCourses.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-6xl mr-4">👥</span>
          Enrollment Manager
        </h1>
        <p className="text-gray-600 text-lg">
          Bulk enroll users in training courses and manage auto-enrollment rules
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-4xl">👤</span>
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Selected Users</h3>
          <p className="text-3xl font-bold text-green-600">{selectedUsers.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-4xl">📚</span>
            <BookOpen className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Selected Courses</h3>
          <p className="text-3xl font-bold text-emerald-600">{selectedCourses.length}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-teal-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-4xl">✅</span>
            <CheckCircle2 className="w-8 h-8 text-teal-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-600 uppercase mb-1">Total Enrollments</h3>
          <p className="text-3xl font-bold text-teal-600">
            {selectedUsers.length * selectedCourses.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* User Selection */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-green-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-green-600" />
              Select Users
            </h2>
            <button
              onClick={() => {
                if (selectedUsers.length === users.length) {
                  setSelectedUsers([]);
                } else {
                  setSelectedUsers(users.map((u) => u.id));
                }
              }}
              className="text-sm text-green-600 hover:text-green-800 font-semibold"
            >
              {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <label
                key={user.id}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selectedUsers.includes(user.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-600">
                    {user.role} • {user.department}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Course Selection */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-emerald-600" />
              Select Courses
            </h2>
            <button
              onClick={() => {
                if (courses && selectedCourses.length === courses.length) {
                  setSelectedCourses([]);
                } else if (courses) {
                  setSelectedCourses(courses.map((c: any) => c.id));
                }
              }}
              className="text-sm text-emerald-600 hover:text-emerald-800 font-semibold"
            >
              {courses && selectedCourses.length === courses.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchCourses}
                onChange={(e) => setSearchCourses(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Course List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredCourses && filteredCourses.map((course: any) => (
              <label
                key={course.id}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selectedCourses.includes(course.id)
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCourses.includes(course.id)}
                  onChange={() => handleCourseToggle(course.id)}
                  className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600">{course.category}</span>
                    {course.required && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        REQUIRED
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-teal-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Ready to Enroll</h3>
            <p className="text-gray-600">
              {selectedUsers.length} users × {selectedCourses.length} courses ={' '}
              <span className="font-bold text-teal-600">
                {selectedUsers.length * selectedCourses.length} enrollments
              </span>
            </p>
          </div>
          <button
            onClick={handleBulkEnroll}
            disabled={
              selectedUsers.length === 0 ||
              selectedCourses.length === 0 ||
              bulkEnrollMutation.isPending
            }
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-6 h-6" />
            {bulkEnrollMutation.isPending ? 'Enrolling...' : 'Enroll Users'}
          </button>
        </div>
      </div>

      {/* Auto-Enroll Rules Builder */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Settings className="w-7 h-7 text-purple-600" />
            Auto-Enrollment Rules
          </h2>
          <button
            onClick={() => setShowAutoEnrollBuilder(!showAutoEnrollBuilder)}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors font-bold"
          >
            <Plus className="w-5 h-5" />
            New Rule
          </button>
        </div>

        {showAutoEnrollBuilder && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Auto-Enrollment Rule</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Rule Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., New Clinician Onboarding"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Trigger Condition
                </label>
                <select className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>When user is created</option>
                  <option>When role changes</option>
                  <option>On specific date</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-bold">
                Save Rule
              </button>
              <button
                onClick={() => setShowAutoEnrollBuilder(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Existing Rules */}
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-900">New Clinician Onboarding</h4>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                ACTIVE
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Automatically enroll new clinicians in required compliance training
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Trigger: User creation</span>
              <span>•</span>
              <span>Target Role: Clinician</span>
              <span>•</span>
              <span>Courses: 3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment History */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-100 p-8 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <History className="w-7 h-7 text-blue-600" />
          Recent Enrollments
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Users</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Courses</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Total</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(Date.now() - i * 86400000).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{Math.floor(Math.random() * 10) + 1}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{Math.floor(Math.random() * 5) + 1}</td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">
                    {Math.floor(Math.random() * 50) + 10}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      SUCCESS
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
