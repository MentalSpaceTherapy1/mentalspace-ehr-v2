import React, { useState } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  Star,
  Users,
  Play,
} from 'lucide-react';
import { useCourses, useEnrollUser } from '../../hooks/useTraining';

export default function CourseCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');

  const filters = {
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
    format: selectedFormat !== 'all' ? selectedFormat : undefined,
    search: searchQuery || undefined,
  };

  const { data: courses, isLoading } = useCourses(filters);
  const enrollMutation = useEnrollUser();

  const categories = ['Clinical Skills', 'Ethics', 'Technology', 'Leadership', 'Compliance'];
  const types = ['CEU', 'Certification', 'Professional Development'];
  const formats = ['Online', 'In-Person', 'Hybrid', 'Self-Paced'];

  const handleEnroll = async (courseId: string) => {
    try {
      await enrollMutation.mutateAsync({
        userId: localStorage.getItem('userId') || '',
        courseId,
      });
      alert('Successfully enrolled in course!');
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll in course');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 flex items-center">
          <span className="text-6xl mr-4">📚</span>
          Course Catalog
        </h1>
        <p className="text-gray-600 text-lg">
          Explore our comprehensive training library and expand your professional skills
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-6 mb-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search courses by title, description, or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Format Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Format</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Formats</option>
              {formats.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedCategory !== 'all' || selectedType !== 'all' || selectedFormat !== 'all' || searchQuery) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Active Filters:</span>
            {searchQuery && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                Search: {searchQuery}
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                {selectedCategory}
              </span>
            )}
            {selectedType !== 'all' && (
              <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold">
                {selectedType}
              </span>
            )}
            {selectedFormat !== 'all' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                {selectedFormat}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedType('all');
                setSelectedFormat('all');
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:bg-gray-300 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-lg text-gray-700">
          Found <span className="font-bold text-indigo-600">{courses?.length || 0}</span> courses
        </p>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-indigo-100 overflow-hidden"
            >
              {/* Course Cover Image */}
              <div className="h-48 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 relative overflow-hidden">
                {course.coverImage ? (
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-8xl">📖</span>
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {course.required && (
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                      REQUIRED
                    </span>
                  )}
                  {course.ceuCredits > 0 && (
                    <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {course.ceuCredits} CEU
                    </span>
                  )}
                </div>
              </div>

              {/* Course Content */}
              <div className="p-6">
                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{course.description}</p>

                {/* Meta Info */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{course.format}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course.enrollmentCount || 0}</span>
                  </div>
                </div>

                {/* Category and Rating */}
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                    {course.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(course.averageRating || 4.5)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-1">
                      ({course.reviewCount || 0})
                    </span>
                  </div>
                </div>

                {/* Instructor */}
                {course.instructorName && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {course.instructorName.charAt(0)}
                    </div>
                    <span>{course.instructorName}</span>
                  </div>
                )}

                {/* Enroll Button */}
                <button
                  onClick={() => handleEnroll(course.id)}
                  disabled={enrollMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5" />
                  {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl shadow-xl border-2 border-indigo-100">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No courses found</h3>
          <p className="text-gray-600">Try adjusting your filters or search query</p>
        </div>
      )}
    </div>
  );
}
