import React, { useState } from 'react';
import { Layout, Grid3x3, Maximize2, PictureInPicture2 } from 'lucide-react';

export type PiPMode = 'full' | 'side-by-side' | 'grid' | 'floating';

interface PictureInPictureControllerProps {
  currentMode: PiPMode;
  onModeChange: (mode: PiPMode) => void;
}

export default function PictureInPictureController({
  currentMode,
  onModeChange,
}: PictureInPictureControllerProps) {
  const [showMenu, setShowMenu] = useState(false);

  const modes = [
    {
      id: 'full' as PiPMode,
      name: 'Full Screen',
      icon: <Maximize2 className="w-5 h-5" />,
      description: 'Remote participant fills the screen',
    },
    {
      id: 'side-by-side' as PiPMode,
      name: 'Side by Side',
      icon: <Layout className="w-5 h-5" />,
      description: 'Equal split view',
    },
    {
      id: 'grid' as PiPMode,
      name: 'Grid View',
      icon: <Grid3x3 className="w-5 h-5" />,
      description: 'Grid layout for multiple participants',
    },
    {
      id: 'floating' as PiPMode,
      name: 'Picture-in-Picture',
      icon: <PictureInPicture2 className="w-5 h-5" />,
      description: 'Floating draggable window',
    },
  ];

  return (
    <div className="relative">
      {/* Mode Toggle Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-gray-200 hover:border-blue-500"
        title="Change View Mode"
      >
        <Layout className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mode Selection Menu */}
      {showMenu && (
        <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4 min-w-[280px] animate-in fade-in zoom-in duration-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">View Mode</h3>
          <div className="space-y-2">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  onModeChange(mode.id);
                  setShowMenu(false);
                }}
                className={`w-full flex items-start space-x-3 p-3 rounded-xl transition-all duration-200 text-left ${
                  currentMode === mode.id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className={`${currentMode === mode.id ? 'text-blue-600' : 'text-gray-600'}`}>
                  {mode.icon}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${currentMode === mode.id ? 'text-blue-900' : 'text-gray-900'}`}>
                    {mode.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mode.description}
                  </p>
                </div>
                {currentMode === mode.id && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
