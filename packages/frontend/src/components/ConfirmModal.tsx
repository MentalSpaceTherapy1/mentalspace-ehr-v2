import { Fragment } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'success' | string;
  isLoading?: boolean;
  icon?: 'warning' | 'danger' | 'info' | 'success';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass,
  confirmVariant,
  isLoading = false,
  icon = 'warning',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const iconMap = {
    warning: { emoji: '⚠️', bgColor: 'from-amber-500 to-orange-500' },
    danger: { emoji: '🗑️', bgColor: 'from-red-500 to-rose-500' },
    info: { emoji: 'ℹ️', bgColor: 'from-blue-500 to-cyan-500' },
    success: { emoji: '✓', bgColor: 'from-green-500 to-emerald-500' },
  };

  const { emoji, bgColor } = iconMap[icon];

  // Map confirmVariant to button classes
  const variantClassMap: Record<string, string> = {
    primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
  };

  const defaultConfirmClass = confirmVariant && variantClassMap[confirmVariant]
    ? variantClassMap[confirmVariant]
    : icon === 'danger'
    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700';

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Icon */}
          <div className={`bg-gradient-to-r ${bgColor} rounded-t-2xl p-6 text-center`}>
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-4xl">{emoji}</span>
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-gray-600 text-center">{message}</p>
          </div>

          {/* Footer */}
          <div className="flex space-x-3 p-6 pt-0">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-3 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none ${
                confirmButtonClass || defaultConfirmClass
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
