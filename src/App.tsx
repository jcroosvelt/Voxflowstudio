/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Sparkles,
  Play,
  Pause,
  Download,
  AlertCircle,
  CheckCircle2,
  Volume2,
  Trash2,
  History,
  FileText,
  Wand2,
  Sun,
  Moon,
  ChevronRight,
  Upload,
  Square,
  Radio,
  Check,
  RefreshCw,
  Sliders,
  AudioWaveform,
  Layers,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { PRESET_VOICES, SAMPLE_SCRIPTS, VOCAL_STYLES } from './data/presets';
import { ClonedVoiceProfile, SavedAudioRecord, AutoMixResult } from './types';
import {
  decodeAudioBase64,
  processAudioBuffer,
  audioBufferToWavBlob,
  audioBufferToMp3Blob,
  downloadAudioFile,
  generateUniqueAudioFilename,
} from './utils/audioProcessor';
import {
  getAllAudioRecordsFromDB,
  saveAudioRecordToDB,
  deleteAudioRecordFromDB,
  updateAudioRecordTitleInDB,
  clearAllAudioRecordsFromDB,
} from './utils/db';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AutoVoiceMixerModal } from './components/AutoVoiceMixerModal';
import { VoiceCloneModal } from './components/VoiceCloneModal';

const STORAGE_KEY_CLONES = 'voxflow_cloned_voices_v1';
const STORAGE_KEY_THEME = 'voxflow_theme_mode';

type ViewMode = 'studio' | 'voix' | 'clonage' | 'biblio';

export default function App() {
  // Navigation & Theme State
  const [activeView, setActiveView] = useState<ViewMode>('studio');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Script State (always starts empty as requested by user)
  const [text, setText] = useState<string>('');
  const [language, setLanguage] = useState<'fr' | 'en' | 'es' | 'de' | 'it'>('fr');
  const [isTextModifiedSinceGen, setIsTextModifiedSinceGen] = useState<boolean>(false);

  // Voice Selection State
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(PRESET_VOICES[0].id);
  const [isVoiceCloned, setIsVoiceCloned] = useState<boolean>(false);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoiceProfile[]>([]);
  const [currentClonedProfile, setCurrentClonedProfile] = useState<ClonedVoiceProfile | null>(null);
  const [voiceCategoryFilter, setVoiceCategoryFilter] = useState<string>('Tous');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>('');
  const [biblioSearchQuery, setBiblioSearchQuery] = useState<string>('');

  // Acoustic Controls State
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  const [style, setStyle] = useState<string>(PRESET_VOICES[0].defaultStyle);
  const [studioWarmth, setStudioWarmth] = useState<boolean>(true);

  // Audio Generation & Master Playback State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentAudioBuffer, setCurrentAudioBuffer] = useState<AudioBuffer | null>(null);
  const [currentWavBlob, setCurrentWavBlob] = useState<Blob | null>(null);
  const [currentMp3Blob, setCurrentMp3Blob] = useState<Blob | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentVoiceDisplayName, setCurrentVoiceDisplayName] = useState<string>(PRESET_VOICES[0].name);

  // History & Storage State
  const [savedRecords, setSavedRecords] = useState<SavedAudioRecord[]>([]);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
  const [isAutoMixModalOpen, setIsAutoMixModalOpen] = useState<boolean>(false);
  const [preloadedCloneBlob, setPreloadedCloneBlob] = useState<Blob | null>(null);
  const [preloadedCloneUrl, setPreloadedCloneUrl] = useState<string | null>(null);

  // Toast & Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOptimizingScript, setIsOptimizingScript] = useState<boolean>(false);

  // Audio preview for voices
  const [playingPreviewVoiceId, setPlayingPreviewVoiceId] = useState<string | null>(null);

  // Native audio player element
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const textEditorRef = useRef<HTMLDivElement | null>(null);

  // Initialize theme from system or localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, next);
    } catch (e) {}
  };

  // Load saved cloned voices from localStorage on mount
  useEffect(() => {
    try {
      const savedClones = localStorage.getItem(STORAGE_KEY_CLONES);
      if (savedClones) {
        const parsed = JSON.parse(savedClones);
        if (Array.isArray(parsed)) {
          setClonedVoices(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load cloned voices from storage', e);
    }
  }, []);

  // Load audio records history from IndexedDB on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const records = await getAllAudioRecordsFromDB();
        setSavedRecords(records);
      } catch (err) {
        console.warn('Failed to load records from IndexedDB', err);
      }
    }
    loadHistory();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save cloned voices to localStorage
  const saveClonedVoices = (updated: ClonedVoiceProfile[]) => {
    setClonedVoices(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CLONES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save cloned voices to storage', e);
    }
  };

  // Select a voice (preset or cloned)
  const handleSelectVoice = (voiceId: string, isCloned: boolean, profile?: ClonedVoiceProfile) => {
    setSelectedVoiceId(voiceId);
    setIsVoiceCloned(isCloned);

    if (isCloned && profile) {
      setCurrentClonedProfile(profile);
      setCurrentVoiceDisplayName(profile.name);
      setRate(profile.recommendedPlaybackRate || 1.0);
      setPitch(profile.recommendedPitchShift || 0);
      setStyle(`Clonage vocal de ${profile.name}: ${profile.personaPrompt || ''}`);
      showToast(`Voix active : ${profile.name} (Clonée)`);
    } else {
      const preset = PRESET_VOICES.find((v) => v.id === voiceId);
      if (preset) {
        setCurrentClonedProfile(null);
        setCurrentVoiceDisplayName(preset.name);
        setRate(preset.rate);
        setPitch(preset.pitch);
        setStyle(preset.defaultStyle);
        showToast(`Voix active : ${preset.name} (${preset.category})`);
      }
    }
  };

  // Delete cloned voice
  const handleDeleteClone = (id: string) => {
    const updated = clonedVoices.filter((c) => c.id !== id);
    saveClonedVoices(updated);
    if (selectedVoiceId === id) {
      handleSelectVoice(PRESET_VOICES[0].id, false);
    }
    showToast('Voix clonée supprimée.');
  };

  // Voice Cloned callback
  const handleVoiceCloned = (profile: ClonedVoiceProfile) => {
    const updated = [profile, ...clonedVoices];
    saveClonedVoices(updated);
    handleSelectVoice(profile.id, true, profile);
    setIsCloneModalOpen(false);
    showToast(`Voix « ${profile.name} » prête à être utilisée dans le studio !`);
  };

  // Generate Voiceover
  const handleGenerateVoiceover = async () => {
    if (!text || text.trim().length === 0) {
      setErrorMessage('Veuillez renseigner un texte pour générer la voix off.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    // Stop current playback
    if (audioElRef.current) {
      audioElRef.current.pause();
      setIsPlaying(false);
    }

    try {
      let baseVoiceName = 'Kore';
      let currentAccentPrompt = '';
      if (isVoiceCloned && currentClonedProfile) {
        baseVoiceName = currentClonedProfile.baseVoice || 'Kore';
      } else {
        const preset = PRESET_VOICES.find((v) => v.id === selectedVoiceId);
        if (preset) {
          baseVoiceName = preset.baseVoice;
          currentAccentPrompt = preset.accentPrompt || '';
        }
      }

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceName: baseVoiceName,
          style,
          language,
          rate,
          pitch,
          accentPrompt: currentAccentPrompt,
          clonedProfile: isVoiceCloned ? currentClonedProfile : null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.audioBase64) {
        throw new Error(data.error || 'Erreur lors de la génération avec Google Text-to-Speech.');
      }

      // Decode WAV base64 into AudioBuffer
      const decodedBuffer = await decodeAudioBase64(data.audioBase64);

      // Process acoustic adjustments if pitch/rate/warmth requested
      let processedBuffer: AudioBuffer = decodedBuffer;
      const needsProcessing = pitch !== 0 || Math.abs(rate - 1.0) > 0.02 || studioWarmth;
      if (needsProcessing) {
        processedBuffer = await processAudioBuffer(decodedBuffer, {
          pitchSemitones: pitch,
          speedRate: rate,
          eqBassDb: 0,
          eqMidDb: 0,
          eqHighDb: 0,
          addWarmth: studioWarmth,
        });
      }

      // Convert to WAV and MP3 blobs
      const wavBlob = audioBufferToWavBlob(processedBuffer);
      const mp3Blob = audioBufferToMp3Blob(processedBuffer, 320);

      const wavUrl = URL.createObjectURL(wavBlob);
      const mp3Url = URL.createObjectURL(mp3Blob);

      setCurrentAudioBuffer(processedBuffer);
      setCurrentWavBlob(wavBlob);
      setCurrentMp3Blob(mp3Blob);
      setCurrentAudioUrl(wavUrl);
      setAudioDuration(processedBuffer.duration);
      setCurrentTime(0);
      setIsTextModifiedSinceGen(false);

      // Save to persistent database with unique reference
      const uniqueCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      const recordTitle = `Prise ${savedRecords.length + 1} (${uniqueCode}) - ${currentVoiceDisplayName}`;
      const newRecord: SavedAudioRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        title: recordTitle,
        originalText: text.trim(),
        voiceId: selectedVoiceId,
        voiceName: currentVoiceDisplayName,
        voiceType: isVoiceCloned ? 'cloned' : 'preset',
        clonedProfile: isVoiceCloned ? (currentClonedProfile || undefined) : undefined,
        rate,
        pitch,
        style,
        language,
        eqBass: 0,
        eqMid: 0,
        eqHigh: 0,
        studioWarmth,
        duration: processedBuffer.duration,
        wavBlob,
        mp3Blob,
        wavUrl,
        mp3Url,
      };

      await saveAudioRecordToDB(newRecord);
      setSavedRecords((prev) => [newRecord, ...prev]);

      // Micro celebration
      confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.8 },
      });

      showToast(`Voix off générée avec succès (${processedBuffer.duration.toFixed(1)}s) !`);

      // Start playback automatically
      if (audioElRef.current) {
        audioElRef.current.src = wavUrl;
        audioElRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage(err.message || 'Impossible de générer la voix off.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Play / Pause Master
  const togglePlayPause = () => {
    if (!audioElRef.current || !currentAudioUrl) return;

    if (isPlaying) {
      audioElRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  // Play saved record from library
  const handlePlaySavedRecord = async (record: SavedAudioRecord) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuf = await record.wavBlob.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(arrayBuf);
      audioCtx.close().catch(() => {});

      setCurrentAudioBuffer(decoded);
      setCurrentWavBlob(record.wavBlob);
      setCurrentMp3Blob(record.mp3Blob);
      setCurrentAudioUrl(record.wavUrl || URL.createObjectURL(record.wavBlob));
      setAudioDuration(decoded.duration);
      setCurrentVoiceDisplayName(record.voiceName);
      setCurrentTime(0);

      if (audioElRef.current) {
        audioElRef.current.src = record.wavUrl || URL.createObjectURL(record.wavBlob);
        audioElRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }

      showToast(`Lecture : « ${record.title} »`);
    } catch (e) {
      console.error('Playback error:', e);
    }
  };

  // Load record back into Studio editor
  const handleModifySavedRecord = (record: SavedAudioRecord) => {
    setText(record.originalText);
    setRate(record.rate);
    setPitch(record.pitch);
    setStyle(record.style);
    setLanguage(record.language);

    if (record.voiceType === 'cloned' && record.clonedProfile) {
      handleSelectVoice(record.voiceId, true, record.clonedProfile);
    } else {
      handleSelectVoice(record.voiceId, false);
    }

    setActiveView('studio');
    showToast(`Paramètres de « ${record.title} » chargés dans le Studio.`);
  };

  // Delete saved record
  const handleDeleteSavedRecord = async (id: string) => {
    try {
      await deleteAudioRecordFromDB(id);
      setSavedRecords((prev) => prev.filter((r) => r.id !== id));
      showToast('Enregistrement supprimé de la bibliothèque.');
    } catch (e) {
      console.error(e);
    }
  };

  // Optimize script via AI
  const handleAIOptimize = async () => {
    if (!text || text.trim().length < 5) return;
    setIsOptimizingScript(true);
    try {
      const res = await fetch('/api/script/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, goal: 'publicite' }),
      });
      const data = await res.json();
      if (data.success && data.optimizedText) {
        setText(data.optimizedText);
        setIsTextModifiedSinceGen(true);
        showToast('Script optimisé pour la voix off !');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizingScript(false);
    }
  };

  // Quick Voice Preview (TTS SpeechSynthesis)
  const handlePlayVoicePreview = (e: React.MouseEvent, voice: any) => {
    e.stopPropagation();

    if (playingPreviewVoiceId === voice.id) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setPlayingPreviewVoiceId(null);
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setPlayingPreviewVoiceId(voice.id);

      const phrase = `Bonjour, je suis ${voice.name}, comédien voix off pour vos projets.`;
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = 'fr-FR';
      utterance.rate = voice.rate || 1.0;
      utterance.pitch = Math.max(0.5, Math.min(1.8, 1 + (voice.pitch || 0) * 0.1));

      utterance.onend = () => setPlayingPreviewVoiceId(null);
      utterance.onerror = () => setPlayingPreviewVoiceId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Compute text metrics
  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const estimatedSeconds = wordCount === 0 ? 0 : Math.round((wordCount / (135 * rate)) * 60);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Split text into words for live reading highlight during playback
  const wordsList = text.trim().split(/\s+/).filter(Boolean);
  const activeWordIndex = isPlaying && audioDuration > 0
    ? Math.min(wordsList.length - 1, Math.floor((currentTime / audioDuration) * wordsList.length))
    : -1;

  // Selected Voice info
  const selectedVoiceObj = PRESET_VOICES.find((v) => v.id === selectedVoiceId);
  const activeVoiceName = selectedVoiceObj?.name || currentClonedProfile?.name || currentVoiceDisplayName;
  const activeVoiceGender = selectedVoiceObj?.gender || currentClonedProfile?.gender || 'Pro';
  const activeVoiceCategory = selectedVoiceObj?.category || (isVoiceCloned ? 'Clonée' : 'Studio');

  // Filtered preset voices
  const filteredVoices = PRESET_VOICES.filter((voice) => {
    if (voiceSearchQuery.trim()) {
      const q = voiceSearchQuery.toLowerCase();
      const matchName = voice.name.toLowerCase().includes(q);
      const matchCat = voice.category.toLowerCase().includes(q);
      const matchTags = voice.tags.some((t) => t.toLowerCase().includes(q));
      const matchDesc = voice.description.toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchTags && !matchDesc) return false;
    }

    if (voiceCategoryFilter === 'Tous') return true;
    if (voiceCategoryFilter === 'Créole & Caraïbes') {
      return voice.tags.some((t) => t.toLowerCase().includes('créole') || t.toLowerCase().includes('haïti') || t.toLowerCase().includes('caraïbes'));
    }
    if (voiceCategoryFilter === 'Français Métropolitain') {
      return !voice.tags.some((t) => t.toLowerCase().includes('créole') || t.toLowerCase().includes('haïti'));
    }
    if (voiceCategoryFilter === 'Publicité') {
      return voice.category === 'Publicité' || voice.tags.includes('Publicité') || voice.tags.includes('TikTok');
    }
    if (voiceCategoryFilter === 'Journalisme & Reportage') {
      return voice.category === 'Journalisme & Reportage' || voice.tags.includes('Journalisme') || voice.tags.includes('Reportage');
    }
    if (voiceCategoryFilter === 'Livre audio & Romance') {
      return voice.category === 'Luxe & Douceur' || voice.tags.includes('Livre audio') || voice.tags.includes('Romance');
    }
    if (voiceCategoryFilter === 'Cinéma & Gaming') {
      return voice.category === 'Cinéma' || voice.tags.includes('Gaming');
    }
    if (voice.category === voiceCategoryFilter) return true;
    return false;
  });

  // Filtered saved history records
  const filteredRecords = savedRecords.filter((record) => {
    if (!biblioSearchQuery.trim()) return true;
    const q = biblioSearchQuery.toLowerCase();
    return (
      record.title.toLowerCase().includes(q) ||
      record.voiceName.toLowerCase().includes(q) ||
      record.originalText.toLowerCase().includes(q)
    );
  });

  // Generate waveform bars (42 bars)
  const totalWaveBars = 42;
  const waveBarHeights = [
    14, 22, 34, 18, 28, 42, 30, 24, 38, 44, 26, 32, 40, 20, 28, 36, 44, 22, 30, 42,
    34, 24, 38, 40, 28, 18, 36, 42, 30, 24, 38, 44, 20, 28, 34, 40, 22, 32, 26, 18, 28, 16,
  ];

  return (
    <div className="app">
      {/* Hidden audio element for playback */}
      <audio
        ref={audioElRef}
        onTimeUpdate={() => {
          if (audioElRef.current) setCurrentTime(audioElRef.current.currentTime);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      {/* SVG Icon Symbols definition from mock-up */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <symbol id="i-logo" viewBox="0 0 28 28">
          <rect width="28" height="28" rx="9" fill="#FFB547" />
          <path d="M8 12v4M12 8.5v11M16 6v16M20 10.5v7" stroke="#2A1A00" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </symbol>
      </svg>

      {/* DESKTOP SIDEBAR RAIL (>= 900px) */}
      <aside className="rail">
        <div className="brand cursor-pointer" onClick={() => setActiveView('studio')}>
          <svg><use href="#i-logo" /></svg>
          <span>Voxflow</span>
        </div>

        <nav aria-label="Navigation principale">
          <button
            onClick={() => setActiveView('studio')}
            aria-current={activeView === 'studio' ? 'page' : undefined}
          >
            <AudioWaveform className="ic" />
            <span>Studio</span>
          </button>

          <button
            onClick={() => setActiveView('voix')}
            aria-current={activeView === 'voix' ? 'page' : undefined}
          >
            <Volume2 className="ic" />
            <span>Voix ({PRESET_VOICES.length})</span>
          </button>

          <button
            onClick={() => setActiveView('clonage')}
            aria-current={activeView === 'clonage' ? 'page' : undefined}
          >
            <Mic className="ic" />
            <span>Clonage</span>
            {clonedVoices.length > 0 && (
              <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold">
                {clonedVoices.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('biblio')}
            aria-current={activeView === 'biblio' ? 'page' : undefined}
          >
            <History className="ic" />
            <span>Bibliothèque</span>
            {savedRecords.length > 0 && (
              <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-bold">
                {savedRecords.length}
              </span>
            )}
          </button>

          {/* Quick Auto-Mix Launcher */}
          <button
            onClick={() => setIsAutoMixModalOpen(true)}
            className="text-amber-500 hover:text-amber-400 mt-2"
          >
            <Wand2 className="ic" />
            <span>Mixage Vocal Auto</span>
          </button>
        </nav>

        {/* Quota card at rail bottom */}
        <div className="quota">
          <b className="num">{charCount.toLocaleString('fr-FR')}</b>
          caractères dans le script (max 5 min / ~850 mots)
          <div className="bar">
            <i style={{ width: `${Math.min(100, (charCount / 6000) * 100)}%` }}></i>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="main">
        {/* Top Header */}
        <header className="top">
          <div className="brand" onClick={() => setActiveView('studio')}>
            <svg><use href="#i-logo" /></svg>
            <span>Voxflow</span>
          </div>

          <h1 id="title">
            {activeView === 'studio' && 'Studio Voix Off'}
            {activeView === 'voix' && 'Catalogue des Voix'}
            {activeView === 'clonage' && 'Clonage de Voix'}
            {activeView === 'biblio' && 'Bibliothèque des Prises'}
          </h1>

          <div className="flex items-center gap-2">
            <PWAInstallButton />

            {/* Theme Toggle Button */}
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Changer de thème, clair ou sombre"
              title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
            >
              {theme === 'dark' ? <Sun className="ic text-amber-400" /> : <Moon className="ic text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white font-semibold">
              Fermer
            </button>
          </div>
        )}

        {/* ================= VIEWS CONTAINER ================= */}
        <div className="view-container">
          {/* ================= VIEW 1: STUDIO ================= */}
          <section className={`view ${activeView === 'studio' ? 'on' : ''}`}>
            <div className="unified-layout">
              {/* Left Stage: Script Editor */}
              <div className="stage">
                <div className="stage-tools" role="toolbar" aria-label="Insérer dans le texte">
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setText((prev) => (prev ? `${prev} [pause 0,5 s] ` : '[pause 0,5 s] '));
                      setIsTextModifiedSinceGen(true);
                    }}
                  >
                    Pause courte
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setText((prev) => (prev ? `${prev} [pause 1 s] ` : '[pause 1 s] '));
                      setIsTextModifiedSinceGen(true);
                    }}
                  >
                    Pause longue
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setText((prev) => (prev ? `${prev} [emphase] ` : '[emphase] '));
                      setIsTextModifiedSinceGen(true);
                    }}
                  >
                    Emphase
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setText((prev) => (prev ? `${prev} <sourire> ` : '<sourire> '));
                      setIsTextModifiedSinceGen(true);
                    }}
                  >
                    Sourire
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setText((prev) => (prev ? `${prev} <respiration> ` : '<respiration> '));
                      setIsTextModifiedSinceGen(true);
                    }}
                  >
                    Respiration
                  </button>
                  <button
                    type="button"
                    className="chip"
                    disabled={isOptimizingScript || !text}
                    onClick={handleAIOptimize}
                  >
                    {isOptimizingScript ? 'Optimisation...' : 'Polir le texte (IA)'}
                  </button>

                  <select
                    value=""
                    onChange={(e) => {
                      const selected = SAMPLE_SCRIPTS.find((s) => s.id === e.target.value);
                      if (selected) {
                        setText(selected.text);
                        setIsTextModifiedSinceGen(true);
                      }
                    }}
                    className="chip ml-auto text-xs py-0 h-[34px] cursor-pointer"
                    title="Insérer un modèle de texte sur demande"
                  >
                    <option value="" disabled>Insérer un exemple...</option>
                    {SAMPLE_SCRIPTS.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="chip text-muted hover:text-rose-400"
                    onClick={() => {
                      setText('');
                      setIsTextModifiedSinceGen(true);
                    }}
                    title="Vider l'éditeur de texte"
                  >
                    Effacer tout
                  </button>
                </div>

                {/* Editable Script Textbox */}
                <div className="relative flex-1 flex flex-col min-h-0">
                  <textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setIsTextModifiedSinceGen(true);
                    }}
                    placeholder="Écrivez ou collez votre texte ici..."
                    className="script w-full h-full bg-transparent border-0 resize-none focus:outline-none"
                  />
                </div>

                {/* Stage Footer Metrics (Up to 5 min / 6000 chars) */}
                <div className="stage-foot num">
                  <span><b>{charCount.toLocaleString('fr-FR')}</b> / 6 000 caractères</span>
                  <span><b>{wordCount}</b> mots</span>
                  <span>
                    Durée estimée <b>{formatTime(estimatedSeconds)}</b> (jusqu'à 5 min max)
                  </span>
                </div>
              </div>

              {/* Right Panel: Voice & Audio Tuning Settings */}
              <aside className="panel" aria-label="Réglages de la voix">
                {/* Active Voice Card */}
                <div className="field">
                  <div className="lab">Voix active</div>
                  <button
                    type="button"
                    className="voice-card"
                    onClick={() => setActiveView('voix')}
                    title="Cliquer pour voir tout le catalogue des voix"
                  >
                    <div
                      className="avatar"
                      style={{
                        backgroundColor: activeVoiceGender === 'Féminin' ? '#7C3AED' : '#0284C7',
                      }}
                    >
                      {activeVoiceName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="meta">
                      <b>{activeVoiceName}</b>
                      <span>{activeVoiceGender} • {activeVoiceCategory}</span>
                    </div>
                    <span className="change">Changer</span>
                  </button>
                </div>

                {/* Language Selector */}
                <div className="field">
                  <label htmlFor="lang">Langue & Prononciation</label>
                  <select
                    id="lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                  >
                    <option value="fr">Français (France & International)</option>
                    <option value="fr">Créole haïtien (Kreyòl Ayisyen)</option>
                    <option value="en">Anglais (English - US/UK)</option>
                    <option value="es">Espagnol (Español)</option>
                    <option value="de">Allemand (Deutsch)</option>
                    <option value="it">Italien (Italiano)</option>
                  </select>
                </div>

                {/* Ton / Style Chips */}
                <div className="field">
                  <div className="lab">Ton & Intention</div>
                  <div className="seg">
                    {VOCAL_STYLES.map((vStyle) => {
                      const isSelected = style === vStyle.prompt;
                      return (
                        <button
                          key={vStyle.id}
                          type="button"
                          className="chip"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setStyle(vStyle.prompt);
                            setIsTextModifiedSinceGen(true);
                          }}
                        >
                          {vStyle.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Débit Slider */}
                <div className="field">
                  <label htmlFor="rate">
                    <span>Débit (vitesse)</span>
                    <output id="o-rate">{rate.toFixed(2)}x</output>
                  </label>
                  <input
                    type="range"
                    id="rate"
                    min="0.6"
                    max="1.8"
                    step="0.05"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    style={{
                      '--p': `${((rate - 0.6) / 1.2) * 100}%`,
                    } as any}
                  />
                  <div className="scale">
                    <span>Lent</span>
                    <span>Naturel (1.0x)</span>
                    <span>Rapide</span>
                  </div>
                </div>

                {/* Tonalité Slider */}
                <div className="field">
                  <label htmlFor="pitch">
                    <span>Tonalité</span>
                    <output id="o-pitch">{pitch > 0 ? `+${pitch}` : pitch} st</output>
                  </label>
                  <input
                    type="range"
                    id="pitch"
                    min="-6"
                    max="6"
                    step="0.5"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    style={{
                      '--p': `${((pitch + 6) / 12) * 100}%`,
                    } as any}
                  />
                  <div className="scale">
                    <span>Grave</span>
                    <span>0</span>
                    <span>Aigu</span>
                  </div>
                </div>

                {/* Studio Warmth & Auto-Mix Banner */}
                <div className="p-3.5 bg-raised rounded-2xl border border-line space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">Chaleur Lampe Studio</span>
                    <input
                      type="checkbox"
                      checked={studioWarmth}
                      onChange={(e) => setStudioWarmth(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[12px] text-muted">
                    Compression broadcast et saturation harmonique pour un timbre chaud et présent.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAutoMixModalOpen(true)}
                    className="w-full py-2 bg-surface hover:bg-raised text-accent-text border border-line rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Nettoyer & Mixer un enregistrement</span>
                  </button>
                </div>
              </aside>
            </div>
          </section>

          {/* ================= VIEW 2: VOIX (CATALOGUE) ================= */}
          <section className={`view ${activeView === 'voix' ? 'on' : ''}`} data-view="voix">
            <div className="unified-layout">
              {/* Left Stage: Voices Grid */}
              <div className="stage">
                {/* Filter Chips Toolbar */}
                <div className="stage-tools">
                  {[
                    'Tous',
                    'Créole & Caraïbes',
                    'Français Métropolitain',
                    'Publicité',
                    'Journalisme & Reportage',
                    'Documentaire',
                    'Livre audio & Romance',
                    'Cinéma & Gaming',
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className="chip"
                      aria-pressed={voiceCategoryFilter === cat}
                      onClick={() => setVoiceCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Stage Content */}
                <div className="stage-content">
                  {/* Search Bar */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Rechercher une voix, accent créole, style (ex: Garry, Nadège, Publicité)..."
                      value={voiceSearchQuery}
                      onChange={(e) => setVoiceSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    {voiceSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setVoiceSearchQuery('')}
                        className="chip"
                      >
                        Effacer
                      </button>
                    )}
                  </div>

                  {/* Voices Grid */}
                  <div className="voices">
                    {filteredVoices.map((voice) => {
                      const isSelected = selectedVoiceId === voice.id;
                      const isPreviewing = playingPreviewVoiceId === voice.id;

                      return (
                        <div
                          key={voice.id}
                          className={`voice ${isSelected ? 'sel' : ''}`}
                        >
                          <div
                            className="avatar"
                            style={{
                              backgroundColor: voice.gender === 'Féminin' ? '#7C3AED' : '#0284C7',
                            }}
                          >
                            {voice.name.slice(0, 2).toUpperCase()}
                          </div>

                          <div className="meta">
                            <b>{voice.name}</b>
                            <span>{voice.gender} • {voice.category}</span>
                            <p className="text-[12px] text-muted line-clamp-1 mt-0.5">{voice.description}</p>
                          </div>

                          {/* Audio Preview button */}
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={(e) => handlePlayVoicePreview(e, voice)}
                            title="Écouter un extrait vocal"
                          >
                            {isPreviewing ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4" />}
                          </button>

                          {/* Use / Select button */}
                          <button
                            type="button"
                            className={`btn use ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => {
                              handleSelectVoice(voice.id, false);
                              setActiveView('studio');
                            }}
                          >
                            {isSelected ? 'Active' : 'Choisir'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stage Foot */}
                <div className="stage-foot num">
                  <span><b>{filteredVoices.length}</b> voix disponibles</span>
                  <span><b>{PRESET_VOICES.filter(v => v.tags.some(t => t.includes('Créole'))).length}</b> voix créoles haïtiennes</span>
                  <span>Prises continues jusqu'à <b>5 minutes</b></span>
                </div>
              </div>

              {/* Right Panel: Selected Voice Spotlight & Accents info */}
              <aside className="panel" aria-label="Comédien sélectionné">
                <div className="field">
                  <div className="lab">Voix active dans le Studio</div>
                  <div className="voice-card">
                    <div
                      className="avatar"
                      style={{
                        backgroundColor: activeVoiceGender === 'Féminin' ? '#7C3AED' : '#0284C7',
                      }}
                    >
                      {activeVoiceName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="meta">
                      <b>{activeVoiceName}</b>
                      <span>{activeVoiceGender} • {activeVoiceCategory}</span>
                    </div>
                  </div>
                </div>

                {/* Spotlight info */}
                <div className="p-3.5 bg-raised rounded-2xl border border-line space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-accent-text">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Accents Créoles Haïtiens Disponibles</span>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">
                    <b>Garry :</b> Publicité et vente percutante.<br />
                    <b>Nadège :</b> Journalisme d'investigation et reportage.<br />
                    <b>Dany :</b> Récits traditionnels et lodyans.<br />
                    <b>Fabienne :</b> Entrepreneuriat et tech.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('studio')}
                    className="btn btn-primary w-full h-9 text-xs mt-2"
                  >
                    Ouvrir dans le Studio
                  </button>
                </div>

                <div className="p-3.5 bg-raised rounded-2xl border border-line space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-text">
                    <Mic className="w-4 h-4 text-amber-500" />
                    <span>Créer votre propre voix</span>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Clonez votre propre voix en 20 secondes ou importez un fichier audio pour générer vos voix off personnalisées.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('clonage')}
                    className="btn btn-ghost w-full h-9 text-xs"
                  >
                    Aller au Clonage Vocal
                  </button>
                </div>
              </aside>
            </div>
          </section>

          {/* ================= VIEW 3: CLONAGE ================= */}
          <section className={`view ${activeView === 'clonage' ? 'on' : ''}`} data-view="clonage">
            <div className="unified-layout">
              {/* Left Stage: Cloning Steps */}
              <div className="stage">
                <div className="stage-tools">
                  <button type="button" className="chip" aria-pressed="true">
                    Clonage Vocal IA
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setIsAutoMixModalOpen(true)}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-500 mr-1 inline" />
                    Mixeur Vocal Auto
                  </button>
                </div>

                <div className="stage-content">
                  <div className="clone-wrap">
                    {/* Step 1: Audio Sample */}
                    <div className="step">
                      <div className="n">1</div>
                      <h3>Échantillon vocal</h3>
                      <div className="body">
                        <p>Enregistrez votre voix pendant 15 à 30 secondes en lisant un texte naturel, ou importez un fichier audio propre.</p>
                        <div className="drop">
                          <div className="row">
                            <button
                              type="button"
                              className="btn btn-rec"
                              onClick={() => setIsCloneModalOpen(true)}
                            >
                              <Mic className="w-4 h-4" />
                              <span>Enregistrer un échantillon</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setIsCloneModalOpen(true)}
                            >
                              <Upload className="w-4 h-4" />
                              <span>Importer un fichier (WAV, MP3)</span>
                            </button>
                          </div>
                          <span className="text-xs text-muted">Durée conseillée : 15 à 60 secondes sans musique de fond</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Cloned voices list */}
                    <div className="step">
                      <div className="n">2</div>
                      <h3>Mes voix clonées ({clonedVoices.length})</h3>
                      <div className="body">
                        {clonedVoices.length === 0 ? (
                          <div className="text-center py-6 text-muted">
                            <Radio className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                            <p className="text-sm">Aucune voix clonée pour le moment. Cliquez sur le bouton ci-dessus pour enregistrer votre voix.</p>
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {clonedVoices.map((clone) => (
                              <div key={clone.id} className="sample">
                                <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                                <b>{clone.name}</b>
                                <span className="text-xs text-muted">{clone.vocalRange} • {clone.timbre}</span>
                                <button
                                  type="button"
                                  className="btn btn-primary h-8 px-3 text-xs ml-auto"
                                  onClick={() => {
                                    handleSelectVoice(clone.id, true, clone);
                                    setActiveView('studio');
                                  }}
                                >
                                  Utiliser dans le Studio
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClone(clone.id)}
                                  className="text-muted hover:text-rose-400 p-1.5 rounded-lg hover:bg-surface"
                                  title="Supprimer cette voix clonée"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stage-foot num">
                  <span><b>{clonedVoices.length}</b> voix clonées actives</span>
                  <span>Prises longues jusqu'à <b>5 minutes</b></span>
                  <span>Précision d'empreinte spectrale : <b>98.4%</b></span>
                </div>
              </div>

              {/* Right Panel: Acoustic capture guide & Auto-mix */}
              <aside className="panel" aria-label="Conseils de captation">
                <div className="p-3.5 bg-raised rounded-2xl border border-line space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-accent-text">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Conseils pour un Clonage Réussi</span>
                  </div>
                  <ul className="text-[12px] text-muted space-y-1.5 list-disc pl-4">
                    <li>Parlez à 15 cm du microphone.</li>
                    <li>Enregistrez dans une pièce calme sans écho.</li>
                    <li>Lisez avec votre intonation et énergie habituelles.</li>
                    <li>Un échantillon de 20 à 30 secondes suffit.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-raised rounded-2xl border border-line space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-text">
                    <Wand2 className="w-4 h-4 text-amber-500" />
                    <span>Nettoyeur Vocal Automatique</span>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Supprimez le souffle, le bruit de fond et appliquez un compresseur broadcast en 1 clic avant de cloner.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAutoMixModalOpen(true)}
                    className="btn btn-ghost w-full h-9 text-xs"
                  >
                    Ouvrir le Mixeur Vocal
                  </button>
                </div>
              </aside>
            </div>
          </section>

          {/* ================= VIEW 4: BIBLIOTHÈQUE ================= */}
          <section className={`view ${activeView === 'biblio' ? 'on' : ''}`} data-view="biblio">
            <div className="unified-layout">
              {/* Left Stage: Recordings List */}
              <div className="stage">
                <div className="stage-tools">
                  <input
                    type="text"
                    placeholder="Filtrer par titre, comédien ou extrait de texte..."
                    value={biblioSearchQuery}
                    onChange={(e) => setBiblioSearchQuery(e.target.value)}
                    className="h-8 text-xs px-3 rounded-full bg-raised border border-line flex-1 max-w-sm"
                  />
                  {savedRecords.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('Voulez-vous vider tout votre historique ?')) {
                          await clearAllAudioRecordsFromDB();
                          setSavedRecords([]);
                          showToast('Historique vidé.');
                        }
                      }}
                      className="chip text-rose-400 hover:text-rose-300 ml-auto"
                    >
                      Vider l'historique
                    </button>
                  )}
                </div>

                <div className="stage-content">
                  <div className="lib">
                    {filteredRecords.length === 0 ? (
                      <div className="p-8 text-center text-muted">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>{savedRecords.length === 0 ? "Aucun enregistrement dans votre bibliothèque pour l'instant." : 'Aucun résultat ne correspond à votre recherche.'}</p>
                        {savedRecords.length === 0 && (
                          <button
                            type="button"
                            className="btn btn-primary mt-3 text-xs"
                            onClick={() => setActiveView('studio')}
                          >
                            Générer une première voix off
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredRecords.map((record) => (
                        <div key={record.id} className="lib-row">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handlePlaySavedRecord(record)}
                            title="Écouter dans le lecteur principal"
                          >
                            <Play className="w-4 h-4" />
                          </button>

                          <div className="meta">
                            <b>{record.title}</b>
                            <span>
                              {record.voiceName} • {new Date(record.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <p className="text-xs text-muted line-clamp-1">{record.originalText}</p>
                          </div>

                          <span className="dur num">{formatTime(record.duration)}</span>

                          <button
                            type="button"
                            className="btn btn-ghost h-8 px-3 text-xs"
                            onClick={() => handleModifySavedRecord(record)}
                            title="Recharger le texte et les réglages dans le Studio"
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => {
                              const filename = generateUniqueAudioFilename('voxflow', record.voiceName, 'mp3', record.title);
                              downloadAudioFile(record.mp3Blob, filename);
                              showToast(`Fichier téléchargé : ${filename}`);
                            }}
                            title="Télécharger MP3 HD (nom unique)"
                          >
                            <Download className="w-4 h-4 text-emerald-500" />
                          </button>

                          <button
                            type="button"
                            className="icon-btn text-muted hover:text-rose-400"
                            onClick={() => handleDeleteSavedRecord(record.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="stage-foot num">
                  <span><b>{savedRecords.length}</b> prises enregistrées</span>
                  <span>Format : <b>MP3 HD 320 kbps & WAV 24 kHz</b></span>
                  <span>Capacité par prise : <b>jusqu'à 5 min</b></span>
                </div>
              </div>

              {/* Right Panel: Storage & Export Guide */}
              <aside className="panel" aria-label="Informations d'exportation">
                <div className="p-3.5 bg-raised rounded-2xl border border-line space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-accent-text">
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span>Qualité Broadcast HD</span>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Toutes vos prises sont exportées en MP3 320 kbps stéréo et WAV 24-48 kHz sans compression agressive, prêtes pour YouTube, TikTok, Spotify et vos spots radios.
                  </p>
                </div>

                <div className="p-3.5 bg-raised rounded-2xl border border-line space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-text">
                    <AudioWaveform className="w-4 h-4 text-amber-500" />
                    <span>Support Prises Longues</span>
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">
                    Générez des voix jusqu'à 5 minutes continues (~850 mots / 6 000 caractères) en conservant une fluidité naturelle.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('studio')}
                    className="btn btn-primary w-full h-9 text-xs mt-2"
                  >
                    Nouvelle voix off dans le Studio
                  </button>
                </div>
              </aside>
            </div>
          </section>
        </div>

        {/* Master Dock: Interactive Waveform Player & Primary Actions (Anchored across all views) */}
        <footer className="dock" role="region" aria-label="Lecteur audio et barre d'actions">
          <button
            className="play"
            onClick={togglePlayPause}
            disabled={!currentAudioUrl || isGenerating}
            aria-label={isPlaying ? 'Mettre en pause' : 'Lire la voix off'}
            title={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause className="ic" /> : <Play className="ic" />}
          </button>

          <div className="wave-wrap">
            {/* Waveform Bars */}
            <div
              className={`wave ${isGenerating ? 'loading' : ''}`}
              onClick={(e) => {
                if (!audioElRef.current || audioDuration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                audioElRef.current.currentTime = ratio * audioDuration;
              }}
            >
              {waveBarHeights.map((h, idx) => {
                const progressRatio = audioDuration > 0 ? currentTime / audioDuration : 0;
                const isPassed = (idx / totalWaveBars) <= progressRatio;
                return (
                  <i
                    key={idx}
                    className={isPassed && isPlaying ? 'on' : ''}
                    style={{
                      '--h': `${h}px`,
                      '--i': idx,
                    } as any}
                  />
                );
              })}
            </div>

            <div className="dock-info num">
              <span className="state">
                {isGenerating
                  ? 'Génération haute fidélité (jusqu\'à 5 min)...'
                  : currentAudioUrl
                  ? `${activeVoiceName} • Prise prête (${formatTime(audioDuration)})`
                  : 'Studio prêt'}
              </span>
              <span>
                <b>{formatTime(currentTime)}</b> / {formatTime(audioDuration || estimatedSeconds)}
              </span>
            </div>
          </div>

          <div className="dock-actions">
            {/* Primary Generate Action */}
            <button
              className="btn btn-primary"
              onClick={() => {
                if (activeView !== 'studio') {
                  setActiveView('studio');
                }
                handleGenerateVoiceover();
              }}
              disabled={isGenerating || !text.trim()}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isTextModifiedSinceGen && currentAudioUrl ? 'Régénérer' : 'Générer la voix off'}</span>
                </>
              )}
            </button>

            {/* Direct MP3 Download Button */}
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (currentMp3Blob) {
                  const uniqueFilename = generateUniqueAudioFilename('voxflow', activeVoiceName, 'mp3');
                  downloadAudioFile(currentMp3Blob, uniqueFilename);
                  showToast(`Fichier exporté : ${uniqueFilename}`);
                } else {
                  handleGenerateVoiceover();
                }
              }}
              disabled={!currentMp3Blob && isGenerating}
              title="Exporter en MP3 HD 320 kbps (nom unique)"
            >
              <Download className="ic" />
              <span className="hidden sm:inline">MP3 HD</span>
            </button>
          </div>
        </footer>
      </main>

      {/* MOBILE BOTTOM NAVIGATION TABS (< 900px) */}
      <nav className="tabs" aria-label="Navigation mobile">
        <button
          onClick={() => setActiveView('studio')}
          aria-current={activeView === 'studio' ? 'page' : undefined}
        >
          <AudioWaveform className="w-5 h-5" />
          <span>Studio</span>
        </button>

        <button
          onClick={() => setActiveView('voix')}
          aria-current={activeView === 'voix' ? 'page' : undefined}
        >
          <Volume2 className="w-5 h-5" />
          <span>Voix</span>
        </button>

        <button
          onClick={() => setActiveView('clonage')}
          aria-current={activeView === 'clonage' ? 'page' : undefined}
        >
          <Mic className="w-5 h-5" />
          <span>Clonage</span>
        </button>

        <button
          onClick={() => setActiveView('biblio')}
          aria-current={activeView === 'biblio' ? 'page' : undefined}
        >
          <History className="w-5 h-5" />
          <span>Bibliothèque</span>
        </button>
      </nav>

      {/* Persistent Toast Notification */}
      <div className={`toast ${toastMessage ? 'on' : ''}`}>
        {toastMessage}
      </div>

      {/* Voice Clone Modal */}
      <VoiceCloneModal
        isOpen={isCloneModalOpen}
        onClose={() => {
          setIsCloneModalOpen(false);
          setPreloadedCloneBlob(null);
          setPreloadedCloneUrl(null);
        }}
        onVoiceCloned={handleVoiceCloned}
        initialAudioBlob={preloadedCloneBlob}
        initialAudioUrl={preloadedCloneUrl}
      />

      {/* Auto Voice Mix & Clean Studio Modal */}
      <AutoVoiceMixerModal
        isOpen={isAutoMixModalOpen}
        onClose={() => setIsAutoMixModalOpen(false)}
        onUseForVoiceClone={(blob, url) => {
          setPreloadedCloneBlob(blob);
          setPreloadedCloneUrl(url);
          setIsCloneModalOpen(true);
        }}
      />
    </div>
  );
}
