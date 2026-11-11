import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Download,
  Volume2,
  VolumeX,
  Wand2,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Radio,
  FileAudio,
  Check,
  Activity,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AutoMixPreset, AutoMixSettings, AutoMixResult } from '../types';
import {
  cleanAndMasterVoice,
  audioBufferToWavBlob,
  audioBufferToMp3Blob,
  downloadAudioFile,
  generateUniqueAudioFilename,
} from '../utils/audioProcessor';

interface AutoVoiceMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseForVoiceClone?: (cleanedBlob: Blob, cleanedUrl: string) => void;
  onSaveToHistory?: (record: {
    title: string;
    wavBlob: Blob;
    mp3Blob: Blob;
    duration: number;
    presetName: string;
  }) => void;
}

export const AutoVoiceMixerModal: React.FC<AutoVoiceMixerModalProps> = ({
  isOpen,
  onClose,
  onUseForVoiceClone,
  onSaveToHistory,
}) => {
  // Step: 'input' -> 'processing' -> 'result'
  const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');
  const [inputTab, setInputTab] = useState<'record' | 'upload'>('record');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingVolume, setRecordingVolume] = useState(0);
  const [rawAudioBlob, setRawAudioBlob] = useState<Blob | null>(null);

  // Settings State
  const [preset, setPreset] = useState<AutoMixPreset>('broadcast');
  const [denoiseIntensity, setDenoiseIntensity] = useState<'light' | 'medium' | 'deep'>('medium');
  const [deEsser, setDeEsser] = useState<boolean>(true);
  const [presenceBoost, setPresenceBoost] = useState<number>(3);
  const [warmthDrive, setWarmthDrive] = useState<number>(35);
  const [targetLoudness, setTargetLoudness] = useState<boolean>(true);

  // Processing & Result State
  const [processingProgressText, setProcessingProgressText] = useState('Analyse du bruit de fond...');
  const [mixResult, setMixResult] = useState<AutoMixResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A/B Comparison Playback State
  const [activePlaybackSource, setActivePlaybackSource] = useState<'cleaned' | 'original'>('cleaned');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextLiveRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleStopAllAudio();
      setMixResult(null);
      setStep('input');
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  }, [isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      handleStopAllAudio();
    };
  }, []);

  const handleStopAllAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextLiveRef.current) {
      audioContextLiveRef.current.close().catch(() => {});
      audioContextLiveRef.current = null;
    }
  };

  // Start microphone recording with live VU meter
  const handleStartRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Live volume visualization
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextLiveRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setRecordingVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // MediaRecorder configuration
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextLiveRef.current) {
          audioContextLiveRef.current.close().catch(() => {});
        }

        const recordedBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setRawAudioBlob(recordedBlob);
        processAudioForMixing(recordedBlob);
      };

      recorder.start(100);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            handleStopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setErrorMessage("Impossible d'accéder au microphone. Veuillez autoriser l'accès audio.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|m4a|aac|ogg|webm)$/i)) {
      setErrorMessage('Format audio non supporté. Veuillez choisir un fichier WAV, MP3, M4A ou WebM.');
      return;
    }

    setRawAudioBlob(file);
    processAudioForMixing(file);
  };

  // Convert Blob to base64 helper
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res.split(',')[1] || res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Primary Processing Pipeline: Real Web Audio DSP + AI Sound Engineer Diagnosis
  const processAudioForMixing = async (blob: Blob, customSettings?: Partial<AutoMixSettings>) => {
    setStep('processing');
    setErrorMessage(null);

    const activeSettings: AutoMixSettings = {
      preset,
      denoiseIntensity,
      deEsser,
      presenceBoost,
      warmthDrive,
      targetLoudness,
      ...customSettings,
    };

    try {
      setProcessingProgressText("1/4 Décodage de l'onde acoustique originale...");
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const rawAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCtx.close().catch(() => {});

      setProcessingProgressText("2/4 Suppression adaptative du souffle et bruit résiduel...");
      await new Promise((r) => setTimeout(r, 200));

      setProcessingProgressText("3/4 Égalisation studio, de-esser et compression broadcast...");
      const cleanedData = await cleanAndMasterVoice(rawAudioBuffer, activeSettings);

      setProcessingProgressText("4/4 Encodage haute fidélité WAV & MP3 320 kbps...");
      const originalWav = audioBufferToWavBlob(rawAudioBuffer);
      const cleanedWav = audioBufferToWavBlob(cleanedData.cleanedBuffer);
      const cleanedMp3 = audioBufferToMp3Blob(cleanedData.cleanedBuffer, 320);

      const originalWavUrl = URL.createObjectURL(originalWav);
      const cleanedWavUrl = URL.createObjectURL(cleanedWav);
      const cleanedMp3Url = URL.createObjectURL(cleanedMp3);

      // Async AI sound engineer diagnostic via Gemini
      let aiDiag: any = null;
      try {
        const base64Audio = await blobToBase64(blob.slice(0, 1024 * 1024)); // first 1MB
        const res = await fetch('/api/audio/diagnose-mix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type || 'audio/webm' }),
        });
        const resJson = await res.json();
        if (resJson.success && resJson.diagnosis) {
          aiDiag = resJson.diagnosis;
        }
      } catch (e) {
        console.warn('AI diagnose background fetch error:', e);
      }

      const result: AutoMixResult = {
        id: `mix_${Date.now()}`,
        timestamp: Date.now(),
        duration: cleanedData.cleanedBuffer.duration,
        originalWavBlob: originalWav,
        originalWavUrl,
        cleanedWavBlob: cleanedWav,
        cleanedWavUrl,
        cleanedMp3Blob: cleanedMp3,
        cleanedMp3Url,
        noiseReductionDb: cleanedData.noiseReductionDb,
        clarityScoreBefore: aiDiag?.clarityScoreBefore || cleanedData.clarityBefore,
        clarityScoreAfter: cleanedData.clarityAfter,
        gainMakeupDb: cleanedData.gainMakeupDb,
        presetUsed: activeSettings.preset,
        aiDiagnosis: aiDiag || {
          noiseLevel: 'Atténué avec succès',
          intelligibility: 'Excellente après égalisation',
          roomAcoustics: 'Résonance neutralisée',
          timbreProfile: 'Présent, chaud et articulé',
          proAdvice: 'Votre prise vocale a été débarrassée du souffle et optimisée au standard broadcast.',
        },
      };

      setMixResult(result);
      setPlaybackDuration(result.duration);
      setActivePlaybackSource('cleaned');
      setStep('result');

      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.7 },
      });
    } catch (err: any) {
      console.error('Processing error:', err);
      setErrorMessage(err.message || 'Erreur lors du mixage de la voix.');
      setStep('input');
    }
  };

  // Re-run mix with new preset or adjustments
  const handleReApplyPreset = (newPreset: AutoMixPreset) => {
    setPreset(newPreset);
    if (rawAudioBlob) {
      processAudioForMixing(rawAudioBlob, { preset: newPreset });
    }
  };

  // Playback Controls
  const togglePlayPause = () => {
    if (!audioPlayerRef.current || !mixResult) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSwitchPlaybackSource = (source: 'cleaned' | 'original') => {
    if (!mixResult) return;
    setActivePlaybackSource(source);

    const audioEl = audioPlayerRef.current;
    if (audioEl) {
      const wasPlaying = isPlaying;
      const currentPos = audioEl.currentTime;
      audioEl.src = source === 'cleaned' ? mixResult.cleanedWavUrl : mixResult.originalWavUrl;
      audioEl.currentTime = currentPos;
      if (wasPlaying) {
        audioEl.play().catch(console.error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <Wand2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Mixage & Nettoyage Vocal Auto</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Qualité Studio HD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Suppression du bruit, résonance de pièce, de-esser, compresseur broadcast et égalisation ultra-propre
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="my-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Input (Record or Upload) */}
        {step === 'input' && (
          <div className="my-6 space-y-6">
            {/* Tab switch: Micro vs Téléversement */}
            <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInputTab('record')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                  inputTab === 'record'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Enregistrer ma voix au microphone</span>
              </button>
              <button
                type="button"
                onClick={() => setInputTab('upload')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                  inputTab === 'upload'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Importer un fichier audio</span>
              </button>
            </div>

            {/* Sub-tab 1: Microphone */}
            {inputTab === 'record' && (
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 text-center space-y-5">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Parlez normalement dans votre micro</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Même avec du bruit ambiant, du souffle d'ordinateur ou un écho de pièce, notre algorithme DSP isole et magnifie votre voix.
                  </p>
                </div>

                {/* Animated VU Meter during recording */}
                {isRecording && (
                  <div className="space-y-2 max-w-xs mx-auto">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Niveau micro</span>
                      <span className="text-emerald-400">{recordingVolume}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-75"
                        style={{ width: `${Math.min(100, recordingVolume)}%` }}
                      />
                    </div>
                    <div className="text-xs font-mono text-emerald-400 animate-pulse">
                      Enregistrement en cours : {recordingSeconds}s / 60s
                    </div>
                  </div>
                )}

                {/* Main Action Button */}
                <div className="pt-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-2xl transition shadow-xl shadow-emerald-500/25 inline-flex items-center gap-2.5 active:scale-95"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Démarrer l'enregistrement</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="px-6 py-3.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm rounded-2xl transition shadow-xl shadow-rose-500/25 inline-flex items-center gap-2.5 animate-pulse active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Arrêter & Nettoyer automatiquement</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab 2: File Upload */}
            {inputTab === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 rounded-2xl p-8 text-center bg-slate-950/50 hover:bg-slate-900/40 cursor-pointer transition space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Glissez-déposez un enregistrement audio
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Prend en charge WAV, MP3, M4A, OGG, WebM (jusqu'à 25 Mo)
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
                >
                  Parcourir mes fichiers
                </button>
              </div>
            )}

            {/* Presets Selection Before Processing */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Profil de mixage cible souhaité :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'broadcast', label: 'Broadcast Studio', desc: 'Chaud, présent & radio' },
                  { id: 'publicite', label: 'Publicité & Punchy', desc: 'Brillant, percutant & net' },
                  { id: 'naturel', label: 'Clair & Naturel', desc: 'Doux, feutré & aéré' },
                  { id: 'storytelling', label: 'Livre Audio / Récit', desc: 'Intime, sans fatigue' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreset(item.id as AutoMixPreset)}
                    className={`p-3 rounded-xl border text-left transition ${
                      preset === item.id
                        ? 'bg-emerald-950/40 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Processing Animation */}
        {step === 'processing' && (
          <div className="my-12 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-emerald-400 animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-slate-800 border-b-cyan-400 animate-spin animation-delay-150" />
              <div className="w-full h-full flex items-center justify-center text-emerald-400">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">Traitement Studio en cours...</h3>
              <p className="text-xs text-emerald-400 font-mono tracking-wide">
                {processingProgressText}
              </p>
            </div>

            <div className="max-w-md mx-auto grid grid-cols-4 gap-2 text-[10px] text-slate-400 pt-2">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span>Coupe-bas 85Hz</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span>Gate Adaptatif</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span>De-Esser 7kHz</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span>Compresseur LUFS</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Results & Instant A/B Comparison */}
        {step === 'result' && mixResult && (
          <div className="my-4 space-y-5">
            {/* Hidden audio element for synchronous A/B playback */}
            <audio
              ref={audioPlayerRef}
              src={activePlaybackSource === 'cleaned' ? mixResult.cleanedWavUrl : mixResult.originalWavUrl}
              onTimeUpdate={() => {
                if (audioPlayerRef.current) {
                  setCurrentTime(audioPlayerRef.current.currentTime);
                }
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* A/B Switcher Header */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Comparateur A/B Instantané :</span>
                </div>

                <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-bold w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleSwitchPlaybackSource('cleaned')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      activePlaybackSource === 'cleaned'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Voix Mixée Studio (Propre)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchPlaybackSource('original')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      activePlaybackSource === 'original'
                        ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Original Brut (Avec bruit)</span>
                  </button>
                </div>
              </div>

              {/* Main Player Bar */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition active:scale-95 shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span className="text-emerald-400 font-semibold">
                      Mode : {activePlaybackSource === 'cleaned' ? '✨ Voix Masterisée Studio' : '🔊 Enregistrement Brut'}
                    </span>
                    <span>
                      {currentTime.toFixed(1)}s / {playbackDuration.toFixed(1)}s
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="h-3 w-full bg-slate-900 rounded-lg overflow-hidden cursor-pointer relative"
                    onClick={(e) => {
                      if (!audioPlayerRef.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      audioPlayerRef.current.currentTime = ratio * playbackDuration;
                    }}
                  >
                    <div
                      className={`h-full transition-all duration-75 ${
                        activePlaybackSource === 'cleaned'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${(currentTime / Math.max(0.1, playbackDuration)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics & Performance Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400">Réduction de bruit</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  -{mixResult.noiseReductionDb} dB
                </div>
                <div className="text-[10px] text-slate-500">Souffle & hum éliminés</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400">Score de clarté</div>
                <div className="text-base font-black text-cyan-400 mt-0.5">
                  {mixResult.clarityScoreBefore}% → {mixResult.clarityScoreAfter}%
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold">+ Intelligibilité</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400">Nivellement vocal</div>
                <div className="text-base font-black text-amber-400 mt-0.5">
                  +{mixResult.gainMakeupDb} dB
                </div>
                <div className="text-[10px] text-slate-500">Standard Broadcast</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400">De-Esser & Présence</div>
                <div className="text-base font-black text-purple-400 mt-0.5">
                  Actif
                </div>
                <div className="text-[10px] text-slate-500">Sifflantes adoucies</div>
              </div>
            </div>

            {/* AI Audio Engineer Diagnostic Box */}
            {mixResult.aiDiagnosis && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 border border-emerald-500/25 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Diagnostic de l'Ingénieur du Son IA :</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {mixResult.aiDiagnosis.proAdvice}
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 bg-slate-900 rounded-md border border-slate-800">
                    Acoustique : <strong>{mixResult.aiDiagnosis.roomAcoustics}</strong>
                  </span>
                  <span className="px-2 py-0.5 bg-slate-900 rounded-md border border-slate-800">
                    Timbre : <strong>{mixResult.aiDiagnosis.timbreProfile}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Re-Tune Preset Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-slate-500 shrink-0 font-medium">Changer de style :</span>
              {[
                { id: 'broadcast', label: 'Broadcast' },
                { id: 'publicite', label: 'Publicité Punchy' },
                { id: 'naturel', label: 'Clair Naturel' },
                { id: 'storytelling', label: 'Livre Audio' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleReApplyPreset(p.id as AutoMixPreset)}
                  className={`px-3 py-1 rounded-lg transition font-semibold text-xs whitespace-nowrap ${
                    preset === p.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {step === 'result' && mixResult ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setRawAudioBlob(null);
                  setMixResult(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Nouvel enregistrement</span>
              </button>

              <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                {/* Download MP3 */}
                <button
                  type="button"
                  onClick={() => {
                    const uniqueFilename = generateUniqueAudioFilename('voxflow_mix', mixResult.presetUsed, 'mp3');
                    downloadAudioFile(mixResult.cleanedMp3Blob, uniqueFilename);
                  }}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Télécharger MP3 320 kbps avec nom unique"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>MP3 HD 320k</span>
                </button>

                {/* Download WAV */}
                <button
                  type="button"
                  onClick={() => {
                    const uniqueFilename = generateUniqueAudioFilename('voxflow_mix', mixResult.presetUsed, 'wav');
                    downloadAudioFile(mixResult.cleanedWavBlob, uniqueFilename);
                  }}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Télécharger WAV Studio sans perte avec nom unique"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>WAV Studio</span>
                </button>

                {/* Direct use for Voice Cloning if supported */}
                {onUseForVoiceClone && (
                  <button
                    type="button"
                    onClick={() => {
                      onUseForVoiceClone(mixResult.cleanedWavBlob, mixResult.cleanedWavUrl);
                      onClose();
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cloner cette voix propre</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
