/**
 * AudioCaptureService - Captures audio from Twilio tracks for transcription
 *
 * This service extracts audio from the clinician's microphone during telehealth
 * sessions and streams it to the backend for AWS Transcribe processing.
 *
 * STAFF ONLY - This captures clinician audio for AI note generation.
 */

import { Socket } from 'socket.io-client';

interface AudioCaptureConfig {
  sampleRate: number;
  bufferSize: number;
  channelCount: number;
}

const DEFAULT_CONFIG: AudioCaptureConfig = {
  sampleRate: 16000,  // AWS Transcribe Medical requires 16kHz
  bufferSize: 4096,   // Buffer size for processing
  channelCount: 1,    // Mono audio
};

export class AudioCaptureService {
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private isCapturing: boolean = false;
  private config: AudioCaptureConfig;

  constructor(config: Partial<AudioCaptureConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize audio capture from a MediaStream (clinician's microphone)
   */
  async initialize(
    mediaStream: MediaStream,
    socket: Socket,
    sessionId: string
  ): Promise<boolean> {
    try {
      this.socket = socket;
      this.sessionId = sessionId;

      // Create AudioContext with target sample rate
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      // If the context sample rate doesn't match, we'll need to resample
      if (import.meta.env.DEV) console.log(`[AudioCapture] AudioContext sample rate: ${this.audioContext.sampleRate}`);

      // Create source from the media stream
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(mediaStream);

      // Create script processor for capturing audio data
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // AudioWorklet would be the modern replacement
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        this.config.channelCount,
        this.config.channelCount
      );

      // Process audio data
      this.scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isCapturing) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM 16-bit)
        const pcmData = this.float32ToInt16(inputData);

        // Send to backend via WebSocket
        this.sendAudioChunk(pcmData);
      };

      // Connect nodes
      this.mediaStreamSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      if (import.meta.env.DEV) console.log('[AudioCapture] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[AudioCapture] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Start capturing audio
   */
  start(): void {
    if (!this.audioContext || !this.socket || !this.sessionId) {
      console.error('[AudioCapture] Not initialized');
      return;
    }

    this.isCapturing = true;

    // Notify backend that audio streaming is starting
    this.socket.emit('transcription:audio-start', {
      sessionId: this.sessionId,
      sampleRate: this.config.sampleRate,
      encoding: 'pcm',
      channels: this.config.channelCount,
    });

    if (import.meta.env.DEV) console.log('[AudioCapture] Started capturing audio');
  }

  /**
   * Stop capturing audio
   */
  stop(): void {
    this.isCapturing = false;

    if (this.socket && this.sessionId) {
      // Notify backend that audio streaming is stopping
      this.socket.emit('transcription:audio-stop', {
        sessionId: this.sessionId,
      });
    }

    if (import.meta.env.DEV) console.log('[AudioCapture] Stopped capturing audio');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.socket = null;
    this.sessionId = null;

    if (import.meta.env.DEV) console.log('[AudioCapture] Destroyed');
  }

  /**
   * Convert Float32Array to Int16Array (PCM 16-bit)
   */
  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp value between -1 and 1
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit signed integer
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  /**
   * Send audio chunk to backend via WebSocket
   */
  private sendAudioChunk(pcmData: Int16Array): void {
    if (!this.socket || !this.sessionId) return;

    // Convert to ArrayBuffer for transmission
    const buffer = pcmData.buffer.slice(
      pcmData.byteOffset,
      pcmData.byteOffset + pcmData.byteLength
    );

    this.socket.emit('transcription:audio-chunk', {
      sessionId: this.sessionId,
      audioData: buffer,
      timestamp: Date.now(),
      sampleRate: this.config.sampleRate,
    });
  }

  /**
   * Check if currently capturing
   */
  isActive(): boolean {
    return this.isCapturing;
  }
}

// Singleton instance for easy access
let audioCaptureInstance: AudioCaptureService | null = null;

export function getAudioCaptureService(): AudioCaptureService {
  if (!audioCaptureInstance) {
    audioCaptureInstance = new AudioCaptureService();
  }
  return audioCaptureInstance;
}

export function destroyAudioCaptureService(): void {
  if (audioCaptureInstance) {
    audioCaptureInstance.destroy();
    audioCaptureInstance = null;
  }
}

export default AudioCaptureService;
