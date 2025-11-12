import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  DollarSign,
  Users,
  Award,
  GraduationCap,
  TrendingUp,
  UserCircle,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useStaff, useStaffCredentials, useStaffTraining, Staff } from '../../hooks/useStaff';

const StaffProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getStaffById } = useStaff();
  const { credentials, loading: credLoading } = useStaffCredentials(id || '');
  const { training, loading: trainingLoading } = useStaffTraining(id || '');
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'training' | 'performance'>('overview');

  useEffect(() => {
    const fetchStaff = async () => {
      if (id) {
        const data = await getStaffById(id);
        setStaff(data);
        setLoading(false);
      }
    };
    fetchStaff();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff member not found</h2>
          <button
            onClick={() => navigate('/staff')}
            className="text-blue-600 hover:underline"
          >
            Return to directory
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCredentialStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600';
      case 'EXPIRED':
        return 'text-red-600';
      case 'PENDING':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrainingStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'REQUIRED':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: UserCircle },
    { id: 'credentials', label: 'Credentials', icon: Award },
    { id: 'training', label: 'Training', icon: GraduationCap },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/staff')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Directory
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative">
          <div className="absolute inset-0 bg-black opacity-10"></div>
        </div>

        {/* Profile Header */}
        <div className="px-8 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16">
            {/* Photo */}
            <div className="relative">
              {staff.photoUrl ? (
                <img
                  src={staff.photoUrl}
                  alt={`${staff.firstName} ${staff.lastName}`}
                  className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <UserCircle className="w-20 h-20 text-gray-400" />
                </div>
              )}
              <div
                className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-medium border-2 border-white shadow-md ${getStatusColor(
                  staff.employmentStatus
                )}`}
              >
                {staff.employmentStatus.replace('_', ' ')}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {staff.firstName} {staff.lastName}
              </h1>
              <p className="text-xl text-gray-600 mb-4">{staff.title}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>{staff.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-purple-500" />
                  <span>{staff.employmentType.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <span>Hired {new Date(staff.hireDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => navigate(`/staff/${id}/edit`)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
            >
              <Edit className="w-5 h-5" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 mb-6 overflow-x-auto">
        <div className="flex gap-1 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Employment Details */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-blue-600" />
                Employment Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <p className="text-lg text-gray-900 mt-1">{staff.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Job Title</label>
                  <p className="text-lg text-gray-900 mt-1">{staff.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Employment Type</label>
                  <p className="text-lg text-gray-900 mt-1">
                    {staff.employmentType.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Employment Status</label>
                  <p className="text-lg text-gray-900 mt-1">
                    {staff.employmentStatus.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Hire Date</label>
                  <p className="text-lg text-gray-900 mt-1">
                    {new Date(staff.hireDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Years of Service</label>
                  <p className="text-lg text-gray-900 mt-1">
                    {Math.floor(
                      (new Date().getTime() - new Date(staff.hireDate).getTime()) /
                        (1000 * 60 * 60 * 24 * 365)
                    )}{' '}
                    years
                  </p>
                </div>
              </div>
            </div>

            {/* Manager & Reports */}
            {(staff.manager || (staff.directReports && staff.directReports.length > 0)) && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  Organizational Hierarchy
                </h2>
                {staff.manager && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Reports To</h3>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      {staff.manager.photoUrl ? (
                        <img
                          src={staff.manager.photoUrl}
                          alt={`${staff.manager.firstName} ${staff.manager.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserCircle className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {staff.manager.firstName} {staff.manager.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{staff.manager.title}</p>
                      </div>
                    </div>
                  </div>
                )}
                {staff.directReports && staff.directReports.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">
                      Direct Reports ({staff.directReports.length})
                    </h3>
                    <div className="space-y-3">
                      {staff.directReports.map((report) => (
                        <div
                          key={report.id}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => navigate(`/staff/${report.id}`)}
                        >
                          {report.photoUrl ? (
                            <img
                              src={report.photoUrl}
                              alt={`${report.firstName} ${report.lastName}`}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserCircle className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {report.firstName} {report.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{report.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Mail className="w-6 h-6 text-green-600" />
                Contact Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <a
                    href={`mailto:${staff.email}`}
                    className="text-blue-600 hover:underline mt-1 block"
                  >
                    {staff.email}
                  </a>
                </div>
                {staff.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </label>
                    <a
                      href={`tel:${staff.phone}`}
                      className="text-blue-600 hover:underline mt-1 block"
                    >
                      {staff.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            {staff.emergencyContact && (
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-red-600" />
                  Emergency Contact
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900 mt-1">{staff.emergencyContact.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Relationship</label>
                    <p className="text-gray-900 mt-1">{staff.emergencyContact.relationship}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <a
                      href={`tel:${staff.emergencyContact.phone}`}
                      className="text-blue-600 hover:underline mt-1 block"
                    >
                      {staff.emergencyContact.phone}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'credentials' && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-600" />
              Credentials & Licenses
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <FileText className="w-4 h-4" />
              Add Credential
            </button>
          </div>
          {credLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No credentials on file</div>
          ) : (
            <div className="space-y-4">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cred.credentialType}</h3>
                      <p className="text-sm text-gray-600">{cred.issuingOrganization}</p>
                    </div>
                    <span className={`flex items-center gap-1 ${getCredentialStatusColor(cred.status)}`}>
                      {cred.status === 'ACTIVE' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {cred.status}
                    </span>
                  </div>
                  {cred.licenseNumber && (
                    <p className="text-sm text-gray-600 mb-2">License: {cred.licenseNumber}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Issued: {new Date(cred.issueDate).toLocaleDateString()}</span>
                    {cred.expirationDate && (
                      <span>Expires: {new Date(cred.expirationDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'training' && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              Training & Certifications
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <FileText className="w-4 h-4" />
              Add Training
            </button>
          </div>
          {trainingLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : training.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No training records</div>
          ) : (
            <div className="space-y-4">
              {training.map((train) => (
                <div
                  key={train.id}
                  className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{train.trainingName}</h3>
                      <p className="text-sm text-gray-600">{train.trainingType}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getTrainingStatusColor(
                        train.status
                      )}`}
                    >
                      {train.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {train.completionDate && (
                      <span>Completed: {new Date(train.completionDate).toLocaleDateString()}</span>
                    )}
                    {train.expirationDate && (
                      <span>Expires: {new Date(train.expirationDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Performance Metrics
          </h2>
          <div className="text-center py-8 text-gray-500">
            Performance tracking coming soon...
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffProfile;
