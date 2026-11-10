import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Clock,
  Globe2,
  ChevronDown,
  Wand2,
  Lightbulb,
} from 'lucide-react';
import { SAMPLE_SCRIPTS } from '../data/presets';

interface VoiceOption {
  id: string;
  name: string;
  category: string;
  isCloned?: boolean;
}

interface ScriptEditorProps {
  text: string;
  onChangeText: (text: string) => void;
  language: 'fr' | 'en' | 'es' | 'de' | 'it';
  onChangeLanguage: (lang: 'fr' | 'en' | 'es' | 'de' | 'it') => void;
  rate: number;
  selectedVoiceId?: string;
  onSelectVoiceId?: (voiceId: string) => void;
  voicesList?: VoiceOption[];
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  text,
  onChangeText,
  language,
  onChangeLanguage,
  rate,
  selectedVoiceId,
  onSelectVoiceId,
  voicesList = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationTip, setOptimizationTip] = useState<string | null>(null);
  const [showSamplesDropdown, setShowSamplesDropdown] = useState(false);

  // Compute metrics
  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  // Approximate duration: ~130 words per minute in French, scaled by rate
  const wordsPerMinute = 135 * rate;
  const estimatedSeconds = wordCount === 0 ? 0 : Math.round((wordCount / wordsPerMinute) * 60);

  const formatEstimatedDuration = (secs: number) => {
    if (secs === 0) return '0 s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `~${s} sec`;
    return `~${m}m ${s}s`;
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertTag = (tag: string) => {
    onChangeText(text ? `${text} ${tag} ` : tag);
  };

  const handleOptimizeScript = async (goal: string) => {
    if (!text || text.trim().length < 5) return;
    setIsOptimizing(true);
    setOptimizationTip(null);

    try {
      const response = await fetch('/api/script/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, goal }),
      });
      const data = await response.json();
      if (data.success && data.optimizedText) {
        onChangeText(data.optimizedText);
        if (data.tips) {
          setOptimizationTip(data.tips);
        }
      }
    } catch (err) {
      console.error('Optimize error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Script & Texte de Voix Off
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Selector in Script Header */}
          {voicesList.length > 0 && onSelectVoiceId && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300">
              <span className="text-emerald-400 font-bold">Voix :</span>
              <select
                value={selectedVoiceId}
                onChange={(e) => onSelectVoiceId(e.target.value)}
                className="bg-transparent text-emerald-300 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                {voicesList.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                    {v.name} ({v.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300">
            <Globe2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as any)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="fr" className="bg-slate-900">Français (FR)</option>
              <option value="en" className="bg-slate-900">English (EN)</option>
              <option value="es" className="bg-slate-900">Español (ES)</option>
              <option value="de" className="bg-slate-900">Deutsch (DE)</option>
              <option value="it" className="bg-slate-900">Italiano (IT)</option>
            </select>
          </div>

          {/* Preset templates dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSamplesDropdown(!showSamplesDropdown)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modèles de script</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSamplesDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-20 space-y-1">
                <div className="text-[10px] uppercase font-semibold text-slate-500 px-3 py-1">
                  Exemples prédéfinis
                </div>
                {SAMPLE_SCRIPTS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      onChangeText(sample.text);
                      setShowSamplesDropdown(false);
                      setOptimizationTip(null);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800 transition group flex flex-col gap-0.5"
                  >
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition">
                      {sample.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Genre : {sample.genre}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Écrivez ou collez ici le texte à faire lire par la voix off... (ex: Bonjour et bienvenue dans notre nouvelle vidéo !)"
          rows={6}
          className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/80 transition resize-y leading-relaxed"
        />

        {/* Floating Quick Insert Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[11px] text-slate-500">Pauses & Intonations :</span>
          <button
            onClick={() => handleInsertTag('[pause 0.5s]')}
            className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-emerald-400 font-mono transition"
          >
            [pause 0.5s]
          </button>
          <button
            onClick={() => handleInsertTag('[pause 1s]')}
            className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-emerald-400 font-mono transition"
          >
            [pause 1s]
          </button>
          <button
            onClick={() => handleInsertTag('<respiration>')}
            className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-cyan-400 font-mono transition"
          >
            &lt;respiration&gt;
          </button>
          <button
            onClick={() => handleInsertTag('<sourire>')}
            className="px-2 py-0.5 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-amber-400 font-mono transition"
          >
            &lt;sourire&gt;
          </button>
        </div>
      </div>

      {/* Script Optimizer Tip if available */}
      {optimizationTip && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 flex items-start gap-2.5 animate-in fade-in">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Conseil d'interprétation studio : </span>
            {optimizationTip}
          </div>
        </div>
      )}

      {/* Bottom action and counter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
        {/* Left: Counters */}
        <div className="flex flex-wrap items-center gap-4 text-slate-400 font-medium">
          <span>
            <strong className="text-slate-200">{wordCount}</strong> mots
          </span>
          <span>
            <strong className="text-slate-200">{charCount}</strong> caractères
          </span>
          <span className={`flex items-center gap-1.5 ${estimatedSeconds > 125 ? 'text-amber-400' : 'text-emerald-400'}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>
              Durée : <strong>{formatEstimatedDuration(estimatedSeconds)}</strong> / 2 min max
            </span>
          </span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Prises longues jusqu'à 2 min
          </span>
        </div>

        {/* Right: AI Polish & Utility buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOptimizeScript('publicite')}
            disabled={isOptimizing || !text}
            title="Optimiser le rythme et les tournures pour la voix off"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-40"
          >
            {isOptimizing ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Polir le script (IA)</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={!text}
            title="Copier le texte"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-40"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              onChangeText('');
              setOptimizationTip(null);
            }}
            disabled={!text}
            title="Effacer le texte"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
