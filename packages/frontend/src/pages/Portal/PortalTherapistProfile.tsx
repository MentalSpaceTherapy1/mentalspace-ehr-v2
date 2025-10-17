import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface TherapistProfile {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  credentials: string[];
  specialties: string[];
  languagesSpoken: string[];
  profileBio: string;
  profilePhotoS3: string | null;
  yearsOfExperience: number;
  education: string[];
  approachesToTherapy: string[];
  treatmentPhilosophy: string;
  acceptsNewClients: boolean;
  licenseNumber: string;
  licenseState: string;
}

export default function PortalTherapistProfile() {
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState<TherapistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTherapistProfile();
  }, []);

  const fetchTherapistProfile = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('portalToken');
      const response = await axios.get('/api/v1/portal/therapist/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setTherapist(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('No therapist assigned to your account');
      } else {
        toast.error('Failed to load therapist profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Therapist Assigned</h3>
          <p className="text-gray-500">You don't have a therapist assigned to your account yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Therapist</h1>
        <p className="text-gray-600">Get to know your mental health provider</p>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12">
            {therapist.profilePhotoS3 ? (
              <img
                src={therapist.profilePhotoS3}
                alt={`${therapist.firstName} ${therapist.lastName}`}
                className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-gray-500">
                  {therapist.firstName[0]}{therapist.lastName[0]}
                </span>
              </div>
            )}
            <div className="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {therapist.firstName} {therapist.lastName}, {therapist.title}
              </h2>
              {therapist.credentials.length > 0 && (
                <p className="text-gray-600 mt-1">
                  {therapist.credentials.join(', ')}
                </p>
              )}
              {therapist.yearsOfExperience && (
                <p className="text-sm text-gray-500 mt-2">
                  {therapist.yearsOfExperience} years of experience
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/portal/therapist/change')}
              className="mt-4 sm:mt-0 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 border border-indigo-300 rounded-lg transition-colors"
            >
              Request Change
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          {therapist.profileBio && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{therapist.profileBio}</p>
            </div>
          )}

          {/* Treatment Philosophy */}
          {therapist.treatmentPhilosophy && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Treatment Philosophy
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{therapist.treatmentPhilosophy}</p>
            </div>
          )}

          {/* Education */}
          {therapist.education.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Education
              </h3>
              <ul className="space-y-3">
                {therapist.education.map((edu, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{edu}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Approaches to Therapy */}
          {therapist.approachesToTherapy.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Therapeutic Approaches
              </h3>
              <div className="flex flex-wrap gap-2">
                {therapist.approachesToTherapy.map((approach, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full"
                  >
                    {approach}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-6">
          {/* Specialties */}
          {therapist.specialties.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Specialties</h3>
              <div className="space-y-2">
                {therapist.specialties.map((specialty, index) => (
                  <div key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{specialty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {therapist.languagesSpoken.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages</h3>
              <div className="space-y-2">
                {therapist.languagesSpoken.map((language, index) => (
                  <div key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    <span className="text-gray-700">{language}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* License Info */}
          {therapist.licenseNumber && therapist.licenseState && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">License Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">License Number</p>
                  <p className="font-medium text-gray-900">{therapist.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">State</p>
                  <p className="font-medium text-gray-900">{therapist.licenseState}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm p-6 border border-indigo-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/portal/appointments/request')}
                className="w-full px-4 py-3 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center space-x-2 border border-indigo-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Request Appointment</span>
              </button>
              <button
                onClick={() => navigate('/portal/messages')}
                className="w-full px-4 py-3 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center space-x-2 border border-indigo-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Send Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
