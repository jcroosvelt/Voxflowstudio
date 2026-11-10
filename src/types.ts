export interface VoicePreset {
  id: string;
  name: string;
  gender: 'Féminin' | 'Masculin';
  accent: string;
  category: 'Publicité' | 'Narration' | 'Documentaire' | 'Podcast' | 'Luxe & Douceur' | 'Cinéma' | 'Créole & Caraïbes' | 'Journalisme & Reportage';
  description: string;
  baseVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  defaultStyle: string;
  pitch: number;
  rate: number;
  tags: string[];
  accentPrompt?: string;
}

export interface ClonedVoiceProfile {
  id: string;
  createdAt: string;
  name: string;
  gender: string;
  vocalRange: string;
  timbre: string;
  pitchContour: string;
  pacing: string;
  baseVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  personaPrompt: string;
  recommendedPitchShift: number;
  recommendedPlaybackRate: number;
  characteristics: string[];
  analysisSummary: string;
  sampleAudioUrl?: string;
  sampleAudioBase64?: string;
}

export interface GenerationSettings {
  text: string;
  voiceId: string;
  language: 'fr' | 'en' | 'es' | 'de' | 'it';
  rate: number;          // 0.6x to 1.8x
  pitch: number;         // -8 to +8 semitones
  style: string;         // e.g. "Chaleureux", "Dynamique", "Cinématique"
  eqBass: number;        // -8 to +8 dB
  eqMid: number;         // -8 to +8 dB
  eqHigh: number;        // -8 to +8 dB
  studioWarmth: boolean; // broadcast compressor / tube emulation
}

export interface SavedAudioRecord {
  id: string;
  createdAt: string;
  timestamp: number;
  title: string;
  originalText: string;
  voiceId: string;
  voiceName: string;
  voiceType: 'preset' | 'cloned';
  clonedProfile?: ClonedVoiceProfile;
  rate: number;
  pitch: number;
  style: string;
  language: 'fr' | 'en' | 'es' | 'de' | 'it';
  eqBass: number;
  eqMid: number;
  eqHigh: number;
  studioWarmth: boolean;
  duration: number;
  mp3Blob: Blob;
  wavBlob: Blob;
  mp3Url?: string;
  wavUrl?: string;
}

export interface AudioTake {
  id: string;
  title: string;
  textSnippet: string;
  fullText: string;
  voiceName: string;
  voiceType: 'preset' | 'cloned';
  timestamp: number;
  duration: number;
  wavBlob: Blob;
  mp3Blob: Blob;
  wavUrl: string;
  mp3Url: string;
  settings: GenerationSettings;
}

export type AutoMixPreset = 'broadcast' | 'publicite' | 'naturel' | 'storytelling' | 'podcast';

export interface AutoMixSettings {
  preset: AutoMixPreset;
  denoiseIntensity: 'light' | 'medium' | 'deep';
  deEsser: boolean;
  presenceBoost: number; // -5 to +10 dB
  warmthDrive: number;   // 0 to 100%
  targetLoudness: boolean;
}

export interface AutoMixResult {
  id: string;
  timestamp: number;
  duration: number;
  originalWavBlob: Blob;
  originalWavUrl: string;
  cleanedWavBlob: Blob;
  cleanedWavUrl: string;
  cleanedMp3Blob: Blob;
  cleanedMp3Url: string;
  noiseReductionDb: number;
  clarityScoreBefore: number;
  clarityScoreAfter: number;
  gainMakeupDb: number;
  presetUsed: AutoMixPreset;
  aiDiagnosis?: {
    noiseLevel: string;
    intelligibility: string;
    roomAcoustics: string;
    timbreProfile: string;
    proAdvice: string;
  };
}


