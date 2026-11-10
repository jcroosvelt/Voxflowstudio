import React, { useState } from 'react';
import {
  Gauge,
  Sliders,
  ChevronDown,
  ChevronUp,
  Volume2,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react';
import { VOCAL_STYLES } from '../data/presets';

interface AcousticControlsProps {
  rate: number;
  pitch: number;
  style: string;
  eqBass: number;
  eqMid: number;
  eqHigh: number;
  studioWarmth: boolean;
  onChangeRate: (rate: number) => void;
  onChangePitch: (pitch: number) => void;
  onChangeStyle: (style: string) => void;
  onChangeEqBass: (val: number) => void;
  onChangeEqMid: (val: number) => void;
  onChangeEqHigh: (val: number) => void;
  onToggleWarmth: (warmth: boolean) => void;
  onResetAcoustics: () => void;
}

export const AcousticControls: React.FC<AcousticControlsProps> = ({
  rate,
  pitch,
  style,
  eqBass,
  eqMid,
  eqHigh,
  studioWarmth,
  onChangeRate,
  onChangePitch,
  onChangeStyle,
  onChangeEqBass,
  onChangeEqMid,
  onChangeEqHigh,
  onToggleWarmth,
  onResetAcoustics,
}) => {
  const [showAdvancedEq, setShowAdvancedEq] = useState(false);

  const ratePresets = [
    { label: 'Lent', value: 0.8 },
    { label: 'Normal', value: 1.0 },
    { label: 'Vif', value: 1.15 },
    { label: 'Rapide', value: 1.35 },
  ];

  const pitchPresets = [
    { label: 'Très Grave', value: -4 },
    { label: 'Grave', value: -2 },
    { label: 'Naturel', value: 0 },
    { label: 'Haut / Clair', value: 2 },
  ];

  const getPitchLabel = (val: number) => {
    if (val === 0) return 'Standard (0 demi-ton)';
    if (val > 0) return `+${val} demi-ton${val > 1 ? 's' : ''} (Plus aigu)`;
    return `${val} demi-tons (Plus grave)`;
  };

  const getRateLabel = (val: number) => {
    if (val === 1.0) return '1.0x (Vitesse normale)';
    if (val < 1.0) return `${val.toFixed(2)}x (Rythme posé)`;
    return `${val.toFixed(2)}x (Rythme soutenu)`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Débit & Tonalité Vocale</span>
          </h3>
          <p className="text-xs text-slate-400">
            Ajustez avec précision la cadence, la hauteur et l'égalisation studio
          </p>
        </div>

        <button
          onClick={onResetAcoustics}
          className="text-[11px] text-slate-400 hover:text-emerald-400 transition underline underline-offset-2"
        >
          Réinitialiser
        </button>
      </div>

      {/* Primary Sliders: Débit & Tonalité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Débit (Speech Rate) Slider */}
        <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>Débit de parole</span>
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {getRateLabel(rate)}
            </span>
          </div>

          <input
            type="range"
            min="0.6"
            max="1.7"
            step="0.05"
            value={rate}
            onChange={(e) => onChangeRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex items-center justify-between gap-1">
            {ratePresets.map((p) => (
              <button
                key={p.label}
                onClick={() => onChangeRate(p.value)}
                className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition ${
                  Math.abs(rate - p.value) < 0.03
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tonalité (Pitch Shift) Slider */}
        <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-cyan-400" />
              <span>Tonalité (Pitch)</span>
            </span>
            <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              {getPitchLabel(pitch)}
            </span>
          </div>

          <input
            type="range"
            min="-6"
            max="6"
            step="0.5"
            value={pitch}
            onChange={(e) => onChangePitch(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />

          <div className="flex items-center justify-between gap-1">
            {pitchPresets.map((p) => (
              <button
                key={p.label}
                onClick={() => onChangePitch(p.value)}
                className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition ${
                  pitch === p.value
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Style Vocal & Intention */}
      <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Intention & Émotion vocale</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Guide l'inflexion du modèle Google TTS
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {VOCAL_STYLES.map((v) => (
            <button
              key={v.id}
              onClick={() => onChangeStyle(v.prompt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                style === v.prompt
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div>
          <input
            type="text"
            value={style}
            onChange={(e) => onChangeStyle(e.target.value)}
            placeholder="Ou décrivez votre style vocal sur mesure (ex: Chaleureux, intime, voix de radio de nuit...)"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Collapsible Advanced Studio EQ & Master Effects */}
      <div className="border border-slate-800/90 rounded-2xl overflow-hidden bg-slate-950/40">
        <button
          onClick={() => setShowAdvancedEq(!showAdvancedEq)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/60 transition"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Mastering Audio & Égaliseur 3 Bandes</span>
            <span className="text-[10px] font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
              Optionnel
            </span>
          </div>
          {showAdvancedEq ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAdvancedEq && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bass EQ */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Basses (120 Hz)</span>
                  <span className="font-mono text-emerald-400 font-semibold">{eqBass > 0 ? `+${eqBass}` : eqBass} dB</span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="1"
                  value={eqBass}
                  onChange={(e) => onChangeEqBass(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Mid EQ */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Médiums Présence (2.2 kHz)</span>
                  <span className="font-mono text-cyan-400 font-semibold">{eqMid > 0 ? `+${eqMid}` : eqMid} dB</span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="1"
                  value={eqMid}
                  onChange={(e) => onChangeEqMid(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* High EQ */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Aigus / Clarté (7.5 kHz)</span>
                  <span className="font-mono text-purple-400 font-semibold">{eqHigh > 0 ? `+${eqHigh}` : eqHigh} dB</span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="1"
                  value={eqHigh}
                  onChange={(e) => onChangeEqHigh(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>

            {/* Warmth limiter toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-900">
              <div>
                <div className="text-xs font-semibold text-slate-200">Chaleur Broadcast & Compresseur Studio</div>
                <div className="text-[11px] text-slate-500">Uniformise les niveaux de voix et ajoute de la rondeur acoustique</div>
              </div>
              <button
                onClick={() => onToggleWarmth(!studioWarmth)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  studioWarmth ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    studioWarmth ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
