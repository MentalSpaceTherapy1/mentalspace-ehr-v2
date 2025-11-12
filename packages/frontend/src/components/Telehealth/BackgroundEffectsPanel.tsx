import React, { useState } from 'react';
import { Sparkles, X, Minimize2, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface BackgroundEffectsPanelProps {
  onClose: () => void;
  onApplyBlur: (intensity: number) => void;
  currentBlurIntensity: number;
}

export default function BackgroundEffectsPanel({
  onClose,
  onApplyBlur,
  currentBlurIntensity,
}: BackgroundEffectsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(currentBlurIntensity);

  const handleApplyBlur = () => {
    onApplyBlur(blurIntensity);
    toast.success(`Background blur ${blurIntensity > 0 ? 'applied' : 'removed'}`);
  };

  const presetBlurs = [
    { label: 'None', value: 0 },
    { label: 'Light', value: 5 },
    { label: 'Medium', value: 10 },
    { label: 'Heavy', value: 20 },
  ];

  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border-2 border-gray-300 z-50 transition-all duration-300 ${
        isMinimized ? 'w-80 h-14' : 'w-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">Background Effects</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title="Close Background Effects"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-6 space-y-6">
          {/* Background Blur */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Background Blur</h4>
            <p className="text-sm text-gray-600">
              Blur your background to reduce distractions and maintain privacy
            </p>

            {/* Preset Buttons */}
            <div className="grid grid-cols-4 gap-3">
              {presetBlurs.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setBlurIntensity(preset.value);
                    onApplyBlur(preset.value);
                    toast.success(`Blur set to ${preset.label.toLowerCase()}`);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    blurIntensity === preset.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div
                      className="w-full h-16 bg-gradient-to-br from-purple-400 to-indigo-400 rounded mb-2"
                      style={{
                        filter: `blur(${preset.value}px)`,
                      }}
                    />
                    <p className="text-xs font-medium">{preset.label}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Custom Intensity</label>
                <span className="text-sm text-gray-600">{blurIntensity}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={blurIntensity}
                onChange={(e) => setBlurIntensity(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(blurIntensity / 30) * 100}%, #e5e7eb ${(blurIntensity / 30) * 100}%, #e5e7eb 100%)`,
                }}
              />
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyBlur}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              Apply Effect
            </button>
          </div>

          {/* Future Features Placeholder */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Coming Soon</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Virtual background images</li>
              <li>• AI-powered background replacement</li>
              <li>• Custom background uploads</li>
            </ul>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>Tip:</strong> Background blur helps maintain privacy and reduces visual distractions during your session.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
