import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  FileAudio,
  Sparkles,
  Repeat,
  Sliders,
} from 'lucide-react';
import { downloadAudioFile, generateUniqueAudioFilename } from '../utils/audioProcessor';

interface AudioPlayerWaveformProps {
  audioBuffer: AudioBuffer | null;
  wavBlob: Blob | null;
  mp3Blob: Blob | null;
  voiceName: string;
  isGenerating: boolean;
  onOpenEqModal?: () => void;
}

export const AudioPlayerWaveform: React.FC<AudioPlayerWaveformProps> = ({
  audioBuffer,
  wavBlob,
  mp3Blob,
  voiceName,
  isGenerating,
  onOpenEqModal,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [exportingMp3, setExportingMp3] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Peak bars cached for visualization
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    if (!audioBuffer) {
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setPeaks([]);
      return;
    }

    setDuration(audioBuffer.duration);
    setCurrentTime(0);
    pauseTimeRef.current = 0;
    setIsPlaying(false);

    // Compute peaks for waveform drawing
    const rawData = audioBuffer.getChannelData(0);
    const numBars = 80;
    const blockSize = Math.floor(rawData.length / numBars);
    const calculatedPeaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      let max = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j += 10) {
        const val = Math.abs(rawData[start + j] || 0);
        if (val > max) max = val;
      }
      calculatedPeaks.push(Math.min(1, max * 1.3));
    }
    setPeaks(calculatedPeaks);

    return () => {
      stopPlayback();
    };
  }, [audioBuffer]);

  // Handle play/pause
  const togglePlay = () => {
    if (!audioBuffer) return;
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback(pauseTimeRef.current);
    }
  };

  const startPlayback = (offsetSeconds: number) => {
    if (!audioBuffer) return;

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Stop existing source if any
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
    }

    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = isLooping;

    const gain = ctx.createGain();
    gain.gain.value = isMuted ? 0 : volume;

    source.connect(gain);
    gain.connect(ctx.destination);

    sourceNodeRef.current = source;
    gainNodeRef.current = gain;

    const safeOffset = offsetSeconds >= audioBuffer.duration ? 0 : offsetSeconds;
    startTimeRef.current = ctx.currentTime - safeOffset;
    source.start(0, safeOffset);
    setIsPlaying(true);

    source.onended = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
        pauseTimeRef.current = 0;
      }
    };

    updateProgress();
  };

  const pausePlayback = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    pauseTimeRef.current = currentTime;
    setIsPlaying(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    pauseTimeRef.current = 0;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const updateProgress = () => {
    if (!audioContextRef.current || !isPlaying || !audioBuffer) return;

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    if (isLooping) {
      setCurrentTime(elapsed % audioBuffer.duration);
    } else {
      if (elapsed >= audioBuffer.duration) {
        setCurrentTime(audioBuffer.duration);
        setIsPlaying(false);
        pauseTimeRef.current = 0;
        return;
      }
      setCurrentTime(elapsed);
    }

    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioBuffer || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;

    setCurrentTime(newTime);
    pauseTimeRef.current = newTime;

    if (isPlaying) {
      startPlayback(newTime);
    }
  };

  // Adjust volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (peaks.length === 0) {
      // Empty waveform placeholder line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const progressRatio = duration > 0 ? currentTime / duration : 0;
    const barWidth = width / peaks.length;
    const gap = 2;
    const actualBarWidth = Math.max(2, barWidth - gap);

    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const barHeight = Math.max(4, peak * (height - 8));
      const y = (height - barHeight) / 2;
      const isPast = i / peaks.length <= progressRatio;

      if (isPast) {
        // Gradient for played audio (emerald to cyan)
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(1, '#06b6d4');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, actualBarWidth, barHeight, 2);
      ctx.fill();
    });

    // Playhead indicator
    const playheadX = progressRatio * width;
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [peaks, currentTime, duration]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const handleDownloadMp3 = () => {
    if (!mp3Blob) return;
    setExportingMp3(true);
    const filename = generateUniqueAudioFilename('voxflow', voiceName, 'mp3');
    downloadAudioFile(mp3Blob, filename);
    setTimeout(() => setExportingMp3(false), 800);
  };

  const handleDownloadWav = () => {
    if (!wavBlob) return;
    const filename = generateUniqueAudioFilename('voxflow', voiceName, 'wav');
    downloadAudioFile(wavBlob, filename);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header of the Player */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileAudio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Piste Master</span>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                {audioBuffer ? `${voiceName} • 24 kHz` : 'En attente'}
              </span>
            </div>
            <h4 className="text-sm font-medium text-slate-200">
              {audioBuffer ? 'Fichier audio prêt à l’écoute & export' : 'Générez votre première voix off ci-dessus'}
            </h4>
          </div>
        </div>

        {/* Quick action buttons & timecode */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-emerald-400 font-semibold">{formatTime(currentTime)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTime(duration)}</span>

          {onOpenEqModal && (
            <button
              onClick={onOpenEqModal}
              title="Paramètres acoustiques & effets studio"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-sans"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Effets Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Waveform Canvas & Scrubber */}
      <div
        onClick={handleSeek}
        className={`relative h-20 bg-slate-950/70 rounded-xl border border-slate-800/80 p-2 cursor-pointer group transition select-none ${
          !audioBuffer ? 'opacity-40 pointer-events-none' : 'hover:border-slate-700'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={64}
          className="w-full h-full block"
        />

        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center gap-3 backdrop-blur-sm rounded-xl">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-emerald-400 font-medium">Synthèse audio Google en cours...</span>
          </div>
        )}

        {!audioBuffer && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            Tapez votre texte et cliquez sur « Générer la voix off »
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-800/80">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (audioBuffer) {
                stopPlayback();
                startPlayback(0);
              }
            }}
            disabled={!audioBuffer}
            title="Revenir au début"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-30 disabled:pointer-events-none"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!audioBuffer}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition shadow-lg ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
            } disabled:opacity-30 disabled:pointer-events-none active:scale-95`}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            disabled={!audioBuffer}
            title={isLooping ? 'Boucle active' : 'Activer la boucle'}
            className={`p-2 rounded-xl transition disabled:opacity-30 disabled:pointer-events-none ${
              isLooping ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Volume slider */}
          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-800">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-400 hover:text-slate-200"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {/* Right: Export Section (MP3 & WAV) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadWav}
            disabled={!wavBlob}
            title="Télécharger la version studio lossless .WAV (24kHz)"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Format WAV</span>
          </button>

          <button
            onClick={handleDownloadMp3}
            disabled={!mp3Blob || exportingMp3}
            title="Exporter en format MP3 universel haute fidélité (320 kbps)"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-semibold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          >
            {exportingMp3 ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Exporter en MP3</span>
            <span className="px-1.5 py-0.2 bg-slate-950/20 text-[10px] rounded font-mono font-bold">MP3</span>
          </button>
        </div>
      </div>
    </div>
  );
};
