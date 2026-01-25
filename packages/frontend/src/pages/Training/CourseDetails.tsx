import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Award,
  Clock,
  BookOpen,
  CheckCircle2,
  Users,
  Star,
  Download,
  Share2,
  FileText,
  Video,
} from 'lucide-react';
import { useCourse, useEnrollUser } from '../../hooks/useTraining';
import { useAuth } from '../../hooks/useAuth';

export default function CourseDetails() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'reviews'>('overview');

  // Use auth hook for user data - no localStorage dependency
  const { user } = useAuth();
  const { data: course, isLoading } = useCourse(courseId || '');
  const enrollMutation = useEnrollUser();

  const handleEnroll = async () => {
    if (!courseId || !user?.id) {
      toast.error('Please log in to enroll in courses');
      return;
    }
    try {
      await enrollMutation.mutateAsync({
        userId: user.id,
        courseId,
      });
      toast.success('Successfully enrolled in course!');
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll in course');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Course not found</h2>
          <button
            onClick={() => navigate('/training/catalog')}
            className="text-indigo-600 hover:underline"
          >
            Return to catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/training/catalog')}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Catalog
      </button>

      {/* Hero Section */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Course Image */}
          <div className="h-96 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 relative">
            {course.coverImage ? (
              <img
                src={course.coverImage}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-9xl">📚</span>
              </div>
            )}
            {/* Badges */}
            <div className="absolute top-6 left-6 flex flex-col gap-2">
              {course.required && (
                <span className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full shadow-lg">
                  REQUIRED
                </span>
              )}
              {course.ceuCredits > 0 && (
                <span className="px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  {course.ceuCredits} CEU Credits
                </span>
              )}
            </div>
          </div>

          {/* Course Info */}
          <div className="p-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              {course.title}
            </h1>

            <p className="text-lg text-gray-700 mb-6">{course.description}</p>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-700">Duration</span>
                </div>
                <p className="text-2xl font-bold text-indigo-600">{course.duration} hours</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-700">Format</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{course.format}</p>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-xl p-4 border border-pink-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-pink-600" />
                  <span className="text-sm font-semibold text-gray-700">Enrolled</span>
                </div>
                <p className="text-2xl font-bold text-pink-600">{course.enrollmentCount || 0}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-gray-700">Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-amber-600">
                    {course.averageRating?.toFixed(1) || '4.5'}
                  </p>
                  <span className="text-sm text-gray-600">({course.reviewCount || 0})</span>
                </div>
              </div>
            </div>

            {/* Category and Type */}
            <div className="flex items-center gap-3 mb-6">
              <span className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full">
                {course.category}
              </span>
              <span className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-bold rounded-full">
                {course.type}
              </span>
              {course.creditType && (
                <span className="px-4 py-2 bg-pink-100 text-pink-700 text-sm font-bold rounded-full">
                  {course.creditType}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleEnroll}
                disabled={enrollMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-6 h-6" />
                {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Now'}
              </button>
              <button className="px-6 py-4 border-2 border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-bold">
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden">
            <div className="flex border-b-2 border-indigo-100">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-6 py-4 font-bold text-lg transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex-1 px-6 py-4 font-bold text-lg transition-colors ${
                  activeTab === 'materials'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Materials
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 px-6 py-4 font-bold text-lg transition-colors ${
                  activeTab === 'reviews'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Reviews
              </button>
            </div>

            <div className="p-8">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Overview</h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed">{course.description}</p>

                    {/* Learning Objectives */}
                    <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">
                      Learning Objectives
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">
                          Understand core concepts and theoretical frameworks
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">
                          Apply practical skills in real-world scenarios
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">
                          Demonstrate mastery through assessments and projects
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">
                          Earn CEU credits for professional development
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'materials' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Materials</h2>
                  {course.materials && course.materials.length > 0 ? (
                    <div className="space-y-3">
                      {course.materials.map((material: any, index: number) => (
                        <div
                          key={material.id || index}
                          className="bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl p-4 border border-indigo-200 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {material.type === 'video' ? (
                                <Video className="w-6 h-6 text-indigo-600" />
                              ) : (
                                <FileText className="w-6 h-6 text-indigo-600" />
                              )}
                              <div>
                                <h3 className="font-bold text-gray-900">{material.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {material.type} • {material.size || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2">
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No materials available yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Student Reviews</h2>
                  <div className="space-y-4">
                    {/* Sample Review */}
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl p-4 border border-purple-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                              U{i}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">User {i}</p>
                              <p className="text-xs text-gray-600">2 weeks ago</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, j) => (
                              <Star
                                key={j}
                                className="w-4 h-4 text-yellow-500 fill-yellow-500"
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700">
                          Excellent course! Very informative and well-structured. The instructor
                          explains complex concepts clearly.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Instructor Card */}
          {course.instructorName && (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Instructor</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {course.instructorName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{course.instructorName}</p>
                  <p className="text-sm text-gray-600">Expert Instructor</p>
                </div>
              </div>
              {course.instructorBio && (
                <p className="text-sm text-gray-700">{course.instructorBio}</p>
              )}
            </div>
          )}

          {/* Prerequisites */}
          {course.prerequisites && course.prerequisites.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Prerequisites</h3>
              <ul className="space-y-2">
                {course.prerequisites.map((prereq: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{prereq}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Courses */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Related Courses</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg p-3 border border-purple-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <h4 className="font-bold text-sm text-gray-900 mb-1">
                    Related Course {i}
                  </h4>
                  <p className="text-xs text-gray-600">2.5 hours • 1.5 CEU</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
