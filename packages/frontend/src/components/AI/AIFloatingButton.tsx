import { Sparkles } from 'lucide-react';

/**
 * AI Floating Button
 * Opens Lisa - the AI Assistant chat
 */

interface AIFloatingButtonProps {
  onClick: () => void;
  isActive: boolean;
  hasNewSuggestions?: boolean;
}

export default function AIFloatingButton({
  onClick,
  isActive,
  hasNewSuggestions = false,
}: AIFloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed right-6 bottom-6 z-40 p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 ${
        isActive
          ? 'bg-gradient-to-r from-purple-600 to-blue-600'
          : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
      }`}
      title="Chat with Lisa"
    >
      <Sparkles className="w-6 h-6 text-white" />
      {hasNewSuggestions && !isActive && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  );
}
