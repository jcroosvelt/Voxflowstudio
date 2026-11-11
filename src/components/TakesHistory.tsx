import React from 'react';
import {
  History,
  Play,
  Download,
  Trash2,
  Sparkles,
  Clock,
  Mic,
} from 'lucide-react';
import { AudioTake } from '../types';
import { downloadAudioFile, generateUniqueAudioFilename } from '../utils/audioProcessor';

interface TakesHistoryProps {
  takes: AudioTake[];
  onSelectTake: (take: AudioTake) => void;
  onDeleteTake: (id: string) => void;
  onClearAll: () => void;
}

export const TakesHistory: React.FC<TakesHistoryProps> = ({
  takes,
  onSelectTake,
  onDeleteTake,
  onClearAll,
}) => {
  if (takes.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Prises & Historique de session ({takes.length})
          </h3>
        </div>

        <button
          onClick={onClearAll}
          className="text-xs text-slate-500 hover:text-rose-400 transition"
        >
          Effacer tout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {takes.map((take) => (
          <div
            key={take.id}
            className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl hover:border-slate-700 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {take.voiceName}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(take.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 italic">
                "{take.textSnippet}..."
              </p>
            </div>

            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/70 text-xs">
              <span className="text-[10px] font-mono text-emerald-400">
                {take.duration.toFixed(1)}s • {take.settings.rate}x
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onSelectTake(take)}
                  title="Charger dans le lecteur"
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  <span>Écouter</span>
                </button>

                <button
                  onClick={() => {
                    const filename = generateUniqueAudioFilename('voxflow', take.voiceName, 'mp3', take.title);
                    downloadAudioFile(take.mp3Blob, filename);
                  }}
                  title="Télécharger en MP3 HD (nom unique)"
                  className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDeleteTake(take.id)}
                  title="Supprimer cette prise"
                  className="p-1 rounded-lg text-slate-600 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
