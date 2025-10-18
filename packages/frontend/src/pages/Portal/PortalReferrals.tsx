import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Referral {
  id: string;
  referredPersonName: string;
  relationship: string;
  status: string;
  createdAt: string;
  contactedDate: string | null;
  intakeScheduledDate: string | null;
  convertedToClientId: string | null;
  convertedDate: string | null;
  incentiveEarned: boolean;
  incentiveAmount: number | null;
}

interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  contactedReferrals: number;
  convertedReferrals: number;
  totalIncentivesEarned: number;
}

export default function PortalReferrals() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [referredPersonName, setReferredPersonName] = useState('');
  const [referredPersonEmail, setReferredPersonEmail] = useState('');
  const [referredPersonPhone, setReferredPersonPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => {
    fetchReferrals();
    fetchStats();
  }, []);

  const fetchReferrals = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('portalToken');
      const response = await axios.get('/portal/referrals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setReferrals(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching referrals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('portalToken');
      const response = await axios.get('/portal/referrals/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!referredPersonName || !referredPersonPhone) {
      toast.error('Please provide at least the name and phone number');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('portalToken');

      const response = await axios.post(
        '/portal/referrals',
        {
          referredPersonName,
          referredPersonEmail: referredPersonEmail || undefined,
          referredPersonPhone,
          relationship: relationship || undefined,
          referralReason: referralReason || undefined,
          additionalNotes: additionalNotes || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success('Thank you for your referral! We will reach out to them soon.');
        setShowForm(false);
        resetForm();
        fetchReferrals();
        fetchStats();
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to submit referral');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setReferredPersonName('');
    setReferredPersonEmail('');
    setReferredPersonPhone('');
    setRelationship('');
    setReferralReason('');
    setAdditionalNotes('');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONTACTED: 'bg-blue-100 text-blue-800',
      SCHEDULED_INTAKE: 'bg-purple-100 text-purple-800',
      BECAME_CLIENT: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
      NO_RESPONSE: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Refer a Friend</h1>
          <p className="text-gray-600">Help someone you care about get the support they need</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{showForm ? 'Cancel' : 'New Referral'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">Total Referrals</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalReferrals}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingReferrals}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">Contacted</p>
            <p className="text-3xl font-bold text-blue-600">{stats.contactedReferrals}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">Converted</p>
            <p className="text-3xl font-bold text-green-600">{stats.convertedReferrals}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">Incentives Earned</p>
            <p className="text-3xl font-bold text-indigo-600">${stats.totalIncentivesEarned.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Referral Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Submit a Referral</h2>
          <form onSubmit={handleSubmitReferral} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Person's Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={referredPersonName}
                  onChange={(e) => setReferredPersonName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={referredPersonPhone}
                  onChange={(e) => setReferredPersonPhone(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={referredPersonEmail}
                  onChange={(e) => setReferredPersonEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="Friend">Friend</option>
                  <option value="Family">Family Member</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why do you think they would benefit from our services?
              </label>
              <textarea
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Optional - Tell us a bit about why you're referring them..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Any other information we should know..."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Privacy Note:</strong> We'll contact this person using the information you provide.
                They will not know you referred them unless you've already discussed it with them.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Referral'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Referrals List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Referrals</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-12 px-6">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No referrals yet</h3>
            <p className="text-gray-500 mb-4">
              Help someone you care about by referring them to our practice
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Make Your First Referral
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {referrals.map((referral) => (
              <div key={referral.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {referral.referredPersonName}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                        {formatStatus(referral.status)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {referral.relationship && (
                        <p>Relationship: <span className="font-medium">{referral.relationship}</span></p>
                      )}
                      <p>Referred on: {formatDate(referral.createdAt)}</p>
                      {referral.contactedDate && (
                        <p>Contacted: {formatDate(referral.contactedDate)}</p>
                      )}
                      {referral.intakeScheduledDate && (
                        <p>Intake Scheduled: {formatDate(referral.intakeScheduledDate)}</p>
                      )}
                      {referral.convertedDate && (
                        <p className="text-green-600 font-medium">
                          Became a client on {formatDate(referral.convertedDate)}!
                        </p>
                      )}
                    </div>
                    {referral.incentiveEarned && referral.incentiveAmount && (
                      <div className="mt-2 inline-flex items-center space-x-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Earned ${referral.incentiveAmount.toFixed(2)} incentive!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
