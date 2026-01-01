import React, { useState } from 'react';
import { Loader2, Sparkles, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface SessionInputBoxProps {
  onGenerate: (sessionNotes: string) => Promise<void>;
  isGenerating: boolean;
  noteType: string;
}

const SessionInputBox: React.FC<SessionInputBoxProps> = ({
  onGenerate,
  isGenerating,
  noteType,
}) => {
  const [sessionNotes, setSessionNotes] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleGenerate = async () => {
    if (!sessionNotes.trim()) {
      toast.error('Please enter session notes or transcription before generating.');
      return;
    }
    await onGenerate(sessionNotes);
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm border border-purple-200 mb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="bg-purple-600 text-white p-2 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              AI-Powered Clinical Note Generation
            </h3>
            <p className="text-sm text-gray-600">
              Enter session notes or paste transcription to auto-generate {noteType}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Instructions */}
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-start space-x-2">
              <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">How it works:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Type or paste your session notes, observations, or audio/video transcription</li>
                  <li>• Click "Generate Note with AI" to auto-populate all form fields</li>
                  <li>• Review the generated content and accept, edit, or reject</li>
                  <li>• AI will fill in text fields, select dropdowns, check boxes, and recommend diagnoses</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Notes / Transcription
            </label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Enter your session notes, observations, or paste a transcription from your audio/video session here...

Example:
Client presented with increased anxiety this week. Reports difficulty sleeping, racing thoughts, and avoidance of social situations. Session focused on cognitive restructuring techniques and identifying triggers. Client engaged well and completed homework from last session. Discussed medication compliance - client reports taking Lexapro 10mg daily as prescribed..."
              className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {sessionNotes.length} characters
              </p>
              {sessionNotes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionNotes('')}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  disabled={isGenerating}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !sessionNotes.trim()}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              isGenerating || !sessionNotes.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Clinical Note...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Note with AI</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionInputBox;
