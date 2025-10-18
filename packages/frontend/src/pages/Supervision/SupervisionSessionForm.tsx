import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';

interface Supervisee {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
}

interface CaseDiscussed {
  clientId?: string;
  clientInitials: string;
  discussionSummary: string;
  clinicalIssues: string[];
  interventionsRecommended: string[];
}

interface ActionItem {
  item: string;
  dueDate?: string;
  completed: boolean;
}

export default function SupervisionSessionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [supervisees, setSupervisees] = useState<Supervisee[]>([]);

  const [formData, setFormData] = useState({
    superviseeId: '',
    sessionDate: format(new Date(), 'yyyy-MM-dd'),
    sessionStartTime: '',
    sessionEndTime: '',
    sessionDuration: 60,
    sessionType: 'Individual',
    sessionFormat: 'In-Person',
    topicsCovered: [] as string[],
    skillsDeveloped: [] as string[],
    feedbackProvided: '',
    areasOfStrength: [] as string[],
    areasForImprovement: [] as string[],
    nextSessionScheduled: false,
    nextSessionDate: '',
    hoursEarned: 1.0,
    hourType: 'Direct Individual',
    superviseeReflection: '',
  });

  const [casesDiscussed, setCasesDiscussed] = useState<CaseDiscussed[]>([
    {
      clientInitials: '',
      discussionSummary: '',
      clinicalIssues: [],
      interventionsRecommended: [],
    },
  ]);

  const [actionItems, setActionItems] = useState<ActionItem[]>([
    { item: '', completed: false },
  ]);

  const [topicInput, setTopicInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [strengthInput, setStrengthInput] = useState('');
  const [improvementInput, setImprovementInput] = useState('');

  useEffect(() => {
    fetchSupervisees();
    if (id) {
      fetchSession();
    }
  }, [id]);

  useEffect(() => {
    // Calculate duration when times change
    if (formData.sessionStartTime && formData.sessionEndTime) {
      const start = new Date(`2000-01-01 ${formData.sessionStartTime}`);
      const end = new Date(`2000-01-01 ${formData.sessionEndTime}`);
      const diff = (end.getTime() - start.getTime()) / 1000 / 60;
      if (diff > 0) {
        setFormData((prev) => ({ ...prev, sessionDuration: diff }));
        // Also update hours earned (assuming 60 min = 1 hour)
        setFormData((prev) => ({ ...prev, hoursEarned: diff / 60 }));
      }
    }
  }, [formData.sessionStartTime, formData.sessionEndTime]);

  const fetchSupervisees = async () => {
    try {
      const response = await api.get('/supervision/supervisees');
      setSupervisees(response.data);
    } catch (error) {
      console.error('Error fetching supervisees:', error);
    }
  };

  const fetchSession = async () => {
    try {
      const response = await api.get(`/supervision/sessions/${id}`);
      const session = response.data;
      setFormData({
        superviseeId: session.superviseeId,
        sessionDate: format(new Date(session.sessionDate), 'yyyy-MM-dd'),
        sessionStartTime: session.sessionStartTime,
        sessionEndTime: session.sessionEndTime,
        sessionDuration: session.sessionDuration,
        sessionType: session.sessionType,
        sessionFormat: session.sessionFormat,
        topicsCovered: session.topicsCovered || [],
        skillsDeveloped: session.skillsDeveloped || [],
        feedbackProvided: session.feedbackProvided || '',
        areasOfStrength: session.areasOfStrength || [],
        areasForImprovement: session.areasForImprovement || [],
        nextSessionScheduled: session.nextSessionScheduled,
        nextSessionDate: session.nextSessionDate ? format(new Date(session.nextSessionDate), 'yyyy-MM-dd') : '',
        hoursEarned: session.hoursEarned,
        hourType: session.hourType,
        superviseeReflection: session.superviseeReflection || '',
      });
      setCasesDiscussed(session.casesDiscussedJson || []);
      setActionItems(session.actionItemsJson || []);
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        casesDiscussedJson: casesDiscussed.filter((c) => c.clientInitials),
        actionItemsJson: actionItems.filter((a) => a.item),
        supervisorSignature: 'Signed via EHR', // In production, use actual signature
        superviseeSignature: 'Signed via EHR',
      };

      if (id) {
        await api.put(`/supervision/sessions/${id}`, payload);
      } else {
        await api.post('/supervision/sessions', payload);
      }

      navigate('/supervision/sessions');
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addTopic = () => {
    if (topicInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        topicsCovered: [...prev.topicsCovered, topicInput.trim()],
      }));
      setTopicInput('');
    }
  };

  const removeTopic = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      topicsCovered: prev.topicsCovered.filter((_, i) => i !== index),
    }));
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        skillsDeveloped: [...prev.skillsDeveloped, skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skillsDeveloped: prev.skillsDeveloped.filter((_, i) => i !== index),
    }));
  };

  const addStrength = () => {
    if (strengthInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        areasOfStrength: [...prev.areasOfStrength, strengthInput.trim()],
      }));
      setStrengthInput('');
    }
  };

  const removeStrength = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      areasOfStrength: prev.areasOfStrength.filter((_, i) => i !== index),
    }));
  };

  const addImprovement = () => {
    if (improvementInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        areasForImprovement: [...prev.areasForImprovement, improvementInput.trim()],
      }));
      setImprovementInput('');
    }
  };

  const removeImprovement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      areasForImprovement: prev.areasForImprovement.filter((_, i) => i !== index),
    }));
  };

  const addCase = () => {
    setCasesDiscussed([
      ...casesDiscussed,
      {
        clientInitials: '',
        discussionSummary: '',
        clinicalIssues: [],
        interventionsRecommended: [],
      },
    ]);
  };

  const removeCase = (index: number) => {
    setCasesDiscussed(casesDiscussed.filter((_, i) => i !== index));
  };

  const updateCase = (index: number, field: string, value: any) => {
    const updated = [...casesDiscussed];
    updated[index] = { ...updated[index], [field]: value };
    setCasesDiscussed(updated);
  };

  const addActionItem = () => {
    setActionItems([...actionItems, { item: '', completed: false }]);
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const updateActionItem = (index: number, field: string, value: any) => {
    const updated = [...actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setActionItems(updated);
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {id ? 'Edit' : 'New'} Supervision Session
          </h1>
          <p className="mt-2 text-gray-600">Document clinical supervision session details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Session Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supervisee *
                </label>
                <select
                  required
                  value={formData.superviseeId}
                  onChange={(e) => setFormData({ ...formData, superviseeId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="">Select supervisee...</option>
                  {supervisees.map((supervisee) => (
                    <option key={supervisee.id} value={supervisee.id}>
                      {supervisee.firstName} {supervisee.lastName} - {supervisee.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.sessionStartTime}
                  onChange={(e) => setFormData({ ...formData, sessionStartTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.sessionEndTime}
                  onChange={(e) => setFormData({ ...formData, sessionEndTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  readOnly
                  value={formData.sessionDuration}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hours Earned
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.hoursEarned}
                  onChange={(e) => setFormData({ ...formData, hoursEarned: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Type *
                </label>
                <select
                  required
                  value={formData.sessionType}
                  onChange={(e) => setFormData({ ...formData, sessionType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="Individual">Individual</option>
                  <option value="Group">Group</option>
                  <option value="Triadic">Triadic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Format *
                </label>
                <select
                  required
                  value={formData.sessionFormat}
                  onChange={(e) => setFormData({ ...formData, sessionFormat: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="In-Person">In-Person</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Phone">Phone</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hour Type *
                </label>
                <select
                  required
                  value={formData.hourType}
                  onChange={(e) => setFormData({ ...formData, hourType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                >
                  <option value="Direct Individual">Direct Individual</option>
                  <option value="Direct Triadic">Direct Triadic</option>
                  <option value="Group">Group</option>
                  <option value="Indirect">Indirect</option>
                  <option value="Observation">Observation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cases Discussed */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Cases Discussed</h2>
              <button
                type="button"
                onClick={addCase}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                + Add Case
              </button>
            </div>

            {casesDiscussed.map((caseItem, index) => (
              <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Case {index + 1}</h3>
                  {casesDiscussed.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCase(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Initials
                    </label>
                    <input
                      type="text"
                      value={caseItem.clientInitials}
                      onChange={(e) => updateCase(index, 'clientInitials', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      placeholder="e.g., J.D."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discussion Summary
                    </label>
                    <textarea
                      value={caseItem.discussionSummary}
                      onChange={(e) => updateCase(index, 'discussionSummary', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      placeholder="Summarize what was discussed about this case..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Topics Covered */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Topics Covered</h2>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="e.g., Ethics, Treatment planning, Specific interventions"
              />
              <button
                type="button"
                onClick={addTopic}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.topicsCovered.map((topic, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm flex items-center gap-2"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeTopic(index)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Skills Developed */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills Developed</h2>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="e.g., Active listening, Boundary setting"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.skillsDeveloped.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Feedback</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback Provided *
                </label>
                <textarea
                  required
                  value={formData.feedbackProvided}
                  onChange={(e) => setFormData({ ...formData, feedbackProvided: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="Detailed feedback provided during the session..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Areas of Strength
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={strengthInput}
                    onChange={(e) => setStrengthInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStrength())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="Identify strengths..."
                  />
                  <button
                    type="button"
                    onClick={addStrength}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.areasOfStrength.map((strength, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {strength}
                      <button
                        type="button"
                        onClick={() => removeStrength(index)}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Areas for Improvement
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={improvementInput}
                    onChange={(e) => setImprovementInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImprovement())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="Areas to work on..."
                  />
                  <button
                    type="button"
                    onClick={addImprovement}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.areasForImprovement.map((area, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeImprovement(index)}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Action Items</h2>
              <button
                type="button"
                onClick={addActionItem}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                + Add Action Item
              </button>
            </div>

            {actionItems.map((item, index) => (
              <div key={index} className="flex items-center gap-4 mb-3">
                <input
                  type="text"
                  value={item.item}
                  onChange={(e) => updateActionItem(index, 'item', e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="Action item..."
                />
                <input
                  type="date"
                  value={item.dueDate || ''}
                  onChange={(e) => updateActionItem(index, 'dueDate', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
                {actionItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeActionItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Next Session */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Session</h2>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.nextSessionScheduled}
                  onChange={(e) => setFormData({ ...formData, nextSessionScheduled: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Next session scheduled
                </label>
              </div>

              {formData.nextSessionScheduled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Session Date
                  </label>
                  <input
                    type="date"
                    value={formData.nextSessionDate}
                    onChange={(e) => setFormData({ ...formData, nextSessionDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Supervisee Reflection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Supervisee Reflection</h2>
            <textarea
              value={formData.superviseeReflection}
              onChange={(e) => setFormData({ ...formData, superviseeReflection: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              placeholder="Supervisee's reflection on the session (optional)..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/supervision/sessions')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : id ? 'Update Session' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
