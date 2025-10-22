import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * SignaturePad Component
 *
 * A canvas-based signature pad for capturing client e-signatures.
 * Supports both mouse and touch input for drawing signatures.
 *
 * Features:
 * - Canvas-based drawing
 * - Clear signature button
 * - Automatic base64 PNG export
 * - Touch and mouse support
 * - Responsive sizing
 */
export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  width = 600,
  height = 200,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configure drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setContext(ctx);
  }, []);

  // Get coordinates from mouse or touch event
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!context) return;

    e.preventDefault();
    const { x, y } = getCoordinates(e);

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  // Draw on canvas
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !context) return;

    e.preventDefault();
    const { x, y } = getCoordinates(e);

    context.lineTo(x, y);
    context.stroke();
  };

  // Stop drawing and export signature
  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (!isEmpty) {
      const canvas = canvasRef.current;
      if (canvas) {
        // Export as base64 PNG
        const signatureData = canvas.toDataURL('image/png');
        onSignatureChange(signatureData);
      }
    }
  };

  // Clear the signature
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !context) return;

    // Clear canvas
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    setIsEmpty(true);
    onSignatureChange(null);
  };

  return (
    <div className={`signature-pad-container ${className}`}>
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair touch-none"
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
          }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={clearSignature}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm flex items-center"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Clear Signature
        </button>

        {!isEmpty && (
          <span className="text-sm text-green-600 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Signature captured
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Draw your signature using your mouse or touch screen
      </p>
    </div>
  );
};

export default SignaturePad;
