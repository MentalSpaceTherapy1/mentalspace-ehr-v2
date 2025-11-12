import React, { useState, useEffect, useRef } from 'react';
import { FileText, Save, Trash2, Copy, X, Minimize2, Maximize2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface QuickNotesPanelProps {
  sessionId: string;
  clientName: string;
}

export default function QuickNotesPanel({
  sessionId,
  clientName,
}: QuickNotesPanelProps) {
  const [notes, setNotes] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem(`session-notes-${sessionId}`);
    if (savedNotes) {
      setNotes(savedNotes);
      const savedTime = localStorage.getItem(`session-notes-time-${sessionId}`);
      if (savedTime) {
        setLastSaved(new Date(savedTime));
      }
    }
  }, [sessionId]);

  // Auto-save notes every 30 seconds
  useEffect(() => {
    if (notes.trim()) {
      autoSaveInterval.current = setInterval(() => {
        saveNotes();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
    };
  }, [notes]);

  // Save notes to localStorage
  const saveNotes = () => {
    if (!notes.trim()) return;

    setIsSaving(true);
    localStorage.setItem(`session-notes-${sessionId}`, notes);
    const now = new Date();
    localStorage.setItem(`session-notes-time-${sessionId}`, now.toISOString());
    setLastSaved(now);

    setTimeout(() => {
      setIsSaving(false);
      toast.success('Notes saved', { duration: 2000 });
    }, 500);
  };

  // Copy notes to clipboard
  const copyNotes = () => {
    if (!notes.trim()) {
      toast.error('No notes to copy');
      return;
    }

    navigator.clipboard.writeText(notes).then(() => {
      toast.success('Notes copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy notes');
    });
  };

  // Download notes as text file
  const downloadNotes = () => {
    if (!notes.trim()) {
      toast.error('No notes to download');
      return;
    }

    const blob = new Blob([notes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-notes-${clientName}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Notes downloaded');
  };

  // Clear notes
  const clearNotes = () => {
    if (window.confirm('Are you sure you want to clear all notes? This cannot be undone.')) {
      setNotes('');
      localStorage.removeItem(`session-notes-${sessionId}`);
      localStorage.removeItem(`session-notes-time-${sessionId}`);
      setLastSaved(null);
      toast.success('Notes cleared');
    }
  };

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;

    return lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-24 right-6 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-200 z-40 group"
        title="Quick Notes (Clinician)"
      >
        <FileText className="w-5 h-5" />
        <span className="absolute -left-32 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Quick Notes
        </span>
      </button>
    );
  }

  return (
    <div
      className={`fixed ${
        isMinimized ? 'top-24 right-6' : 'top-6 right-6'
      } bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 transition-all duration-300 ${
        isMinimized ? 'w-80 h-14' : 'w-96 h-[36rem]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">Quick Notes</h3>
            <p className="text-xs opacity-80">Session with {clientName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setIsMinimized(!isMinimized);
            }}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title="Close Notes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Textarea */}
          <div className="p-4 h-[calc(100%-12rem)]">
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Take quick notes during the session...&#10;&#10;• Observations&#10;• Key points discussed&#10;• Follow-up items&#10;• Client's mood and affect"
              className="w-full h-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
            />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{notes.length} characters</span>
              <span className="flex items-center space-x-1">
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-indigo-500 border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Last saved: {formatLastSaved()}</span>
                )}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={saveNotes}
                disabled={!notes.trim() || isSaving}
                className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm font-medium"
                title="Save Notes"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>

              <button
                onClick={copyNotes}
                disabled={!notes.trim()}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy to Clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={downloadNotes}
                disabled={!notes.trim()}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download as Text File"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={clearNotes}
                disabled={!notes.trim()}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear All Notes"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
