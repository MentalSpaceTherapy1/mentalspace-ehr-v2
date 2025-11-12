import React, { useState, useRef, useEffect } from 'react';
import {
  Pencil,
  Eraser,
  Type,
  Trash2,
  X,
  Minimize2,
  Maximize2,
  Download,
  Circle,
  Square,
  Minus,
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface WhiteboardToolProps {
  socket: Socket | null;
  sessionId: string;
  onClose: () => void;
}

type DrawTool = 'pen' | 'eraser' | 'text' | 'circle' | 'rectangle' | 'line';

interface DrawEvent {
  tool: DrawTool;
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];

export default function WhiteboardTool({
  socket,
  sessionId,
  onClose,
}: WhiteboardToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawTool>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isMinimized, setIsMinimized] = useState(false);
  const [drawHistory, setDrawHistory] = useState<DrawEvent[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Set default styles
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Listen for remote draw events
  useEffect(() => {
    if (!socket) return;

    const handleRemoteDraw = (event: DrawEvent) => {
      console.log('📝 Received remote draw:', event);
      drawEvent(event);
      setDrawHistory((prev) => [...prev, event]);
    };

    const handleClear = () => {
      clearCanvas();
      toast('Whiteboard cleared by participant', { icon: '🗑️' });
    };

    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:clear', handleClear);

    return () => {
      socket.off('whiteboard:draw', handleRemoteDraw);
      socket.off('whiteboard:clear', handleClear);
    };
  }, [socket]);

  // Draw event on canvas
  const drawEvent = (event: DrawEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = event.color;
    ctx.lineWidth = event.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (event.tool === 'pen' && event.points && event.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(event.points[0].x, event.points[0].y);
      for (let i = 1; i < event.points.length; i++) {
        ctx.lineTo(event.points[i].x, event.points[i].y);
      }
      ctx.stroke();
    } else if (event.tool === 'eraser' && event.points && event.points.length > 1) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(event.points[0].x, event.points[0].y);
      for (let i = 1; i < event.points.length; i++) {
        ctx.lineTo(event.points[i].x, event.points[i].y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (event.tool === 'text' && event.text && event.x !== undefined && event.y !== undefined) {
      ctx.fillStyle = event.color;
      ctx.font = `${event.lineWidth * 8}px Arial`;
      ctx.fillText(event.text, event.x, event.y);
    } else if (event.tool === 'circle' && event.x !== undefined && event.y !== undefined && event.width !== undefined) {
      ctx.beginPath();
      ctx.arc(event.x, event.y, event.width, 0, Math.PI * 2);
      ctx.stroke();
    } else if (event.tool === 'rectangle' && event.x !== undefined && event.y !== undefined && event.width !== undefined && event.height !== undefined) {
      ctx.strokeRect(event.x, event.y, event.width, event.height);
    } else if (event.tool === 'line' && event.points && event.points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(event.points[0].x, event.points[0].y);
      ctx.lineTo(event.points[1].x, event.points[1].y);
      ctx.stroke();
    }
  };

  // Get mouse position relative to canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    setCurrentPath([pos]);
  };

  // Draw
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    setCurrentPath((prev) => [...prev, pos]);

    // Draw locally
    const event: DrawEvent = {
      tool: currentTool,
      color: currentColor,
      lineWidth: lineWidth,
      points: [...currentPath, pos],
    };

    drawEvent(event);
  };

  // Stop drawing
  const stopDrawing = () => {
    if (!isDrawing || currentPath.length === 0) {
      setIsDrawing(false);
      return;
    }

    const event: DrawEvent = {
      tool: currentTool,
      color: currentColor,
      lineWidth: lineWidth,
      points: currentPath,
    };

    // Emit to socket
    if (socket && sessionId) {
      socket.emit('whiteboard:draw', {
        sessionId,
        event,
      });
    }

    setDrawHistory((prev) => [...prev, event]);
    setCurrentPath([]);
    setIsDrawing(false);
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDrawHistory([]);
  };

  // Clear and emit
  const handleClear = () => {
    clearCanvas();

    if (socket && sessionId) {
      socket.emit('whiteboard:clear', { sessionId });
    }

    toast.success('Whiteboard cleared');
  };

  // Download canvas
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${sessionId}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    toast.success('Whiteboard downloaded');
  };

  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border-2 border-gray-300 z-50 transition-all duration-300 ${
        isMinimized ? 'w-80 h-14' : 'w-[880px] h-[750px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <Pencil className="w-5 h-5" />
          <h3 className="font-semibold">Whiteboard</h3>
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
            title="Close Whiteboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            {/* Tools */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title="Pen"
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'eraser' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title="Eraser"
              >
                <Eraser className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentTool('line')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title="Line"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentTool('circle')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title="Circle"
              >
                <Circle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentTool('rectangle')}
                className={`p-2 rounded transition-colors ${
                  currentTool === 'rectangle' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title="Rectangle"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>

            {/* Colors & Size */}
            <div className="flex items-center space-x-4">
              {/* Color Picker */}
              <div className="flex items-center space-x-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      currentColor === color ? 'border-blue-600 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              {/* Line Width */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Size:</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-600 w-6">{lineWidth}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadCanvas}
                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handleClear}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                title="Clear All"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="p-4 bg-gray-100">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="bg-white border-2 border-gray-300 rounded-lg cursor-crosshair shadow-lg"
            />
          </div>
        </>
      )}
    </div>
  );
}
