import React, { useState, useRef } from 'react';
import {
  History,
  Play,
  Pause,
  Download,
  Edit3,
  Trash2,
  Search,
  Sliders,
  Calendar,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Volume2,
  Copy,
  Check,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { SavedAudioRecord } from '../types';
import { downloadAudioFile } from '../utils/audioProcessor';

interface AudioHistorySectionProps {
  records: SavedAudioRecord[];
  onPlayInMasterPlayer: (record: SavedAudioRecord) => void;
  onModifyRecord: (record: SavedAudioRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearAllRecords: () => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
}

export const AudioHistorySection: React.FC<AudioHistorySectionProps> = ({
  records,
  onPlayInMasterPlayer,
  onModifyRecord,
  onDeleteRecord,
  onClearAllRecords,
  onUpdateTitle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState('ALL');
  const [expandedTextIds, setExpandedTextIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTimeMap, setCurrentTimeMap] = useState<Record<string, number>>({});
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Editing title state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // Extract unique voice names for filtering
  const uniqueVoices = Array.from(new Set(records.map((r) => r.voiceName)));

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.originalText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.voiceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVoice = selectedVoiceFilter === 'ALL' || r.voiceName === selectedVoiceFilter;
    return matchesSearch && matchesVoice;
  });

  const toggleTextExpanded = (id: string) => {
    setExpandedTextIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePlayInline = (record: SavedAudioRecord) => {
    const url = record.mp3Url || record.wavUrl;
    if (!url) return;

    // If another audio is playing, stop it
    if (playingId && playingId !== record.id) {
      const prevAudio = audioElementsRef.current[playingId];
      if (prevAudio) {
        prevAudio.pause();
      }
    }

    if (playingId === record.id) {
      // Pause current
      const audio = audioElementsRef.current[record.id];
      if (audio) {
        audio.pause();
      }
      setPlayingId(null);
    } else {
      // Create or play audio
      let audio = audioElementsRef.current[record.id];
      if (!audio) {
        audio = new Audio(url);
        audioElementsRef.current[record.id] = audio;

        audio.ontimeupdate = () => {
          setCurrentTimeMap((prev) => ({ ...prev, [record.id]: audio.currentTime }));
        };

        audio.onended = () => {
          setPlayingId(null);
          setCurrentTimeMap((prev) => ({ ...prev, [record.id]: 0 }));
        };
      }

      audio.play().then(() => {
        setPlayingId(record.id);
      }).catch(err => console.error("Playback error:", err));
    }
  };

  const handleSeekInline = (recordId: string, duration: number, e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioElementsRef.current[recordId];
    if (!audio || duration <= 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;
    audio.currentTime = targetTime;
    setCurrentTimeMap((prev) => ({ ...prev, [recordId]: targetTime }));
  };

  const startEditingTitle = (record: SavedAudioRecord) => {
    setEditingTitleId(record.id);
    setEditingTitleValue(record.title);
  };

  const saveEditedTitle = (id: string) => {
    if (editingTitleValue.trim()) {
      onUpdateTitle(id, editingTitleValue.trim());
    }
    setEditingTitleId(null);
  };

  const formatCreationDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownloadMp3 = (record: SavedAudioRecord) => {
    const filename = `voxflow_${record.voiceName.toLowerCase().replace(/\s+/g, '_')}_${record.id}.mp3`;
    downloadAudioFile(record.mp3Blob, filename);
  };

  const handleDownloadWav = (record: SavedAudioRecord) => {
    const filename = `voxflow_${record.voiceName.toLowerCase().replace(/\s+/g, '_')}_${record.id}.wav`;
    downloadAudioFile(record.wavBlob, filename);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Historique des Générations</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {records.length} fichier{records.length > 1 ? 's' : ''} sauvegardé{records.length > 1 ? 's' : ''}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sauvegardé automatiquement avec voix, débit, tonalité et audio réutilisable
              </p>
            </div>
          </div>
        </div>

        {/* Search, Filter, Clear */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par texte ou titre..."
              className="pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition w-56"
            />
          </div>

          {/* Voice Filter */}
          {uniqueVoices.length > 1 && (
            <select
              value={selectedVoiceFilter}
              onChange={(e) => setSelectedVoiceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Toutes les voix ({records.length})</option>
              {uniqueVoices.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}

          {/* Clear All */}
          {records.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment effacer tout votre historique d\'enregistrements ?')) {
                  onClearAllRecords();
                }
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer tout</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {records.length === 0 ? (
        <div className="py-14 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-400 mx-auto flex items-center justify-center">
            <History className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-300">
              Aucun fichier audio dans l'historique
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Chaque génération audio est automatiquement archivée ici avec son texte original, ses réglages de débit/tonalité et son fichier MP3 téléchargeable à tout moment.
            </p>
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="py-10 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 text-xs text-slate-400">
          Aucun résultat pour votre recherche « {searchTerm} ».
        </div>
      ) : (
        /* History Grid / List */
        <div className="space-y-4">
          {filteredRecords.map((record) => {
            const isPlaying = playingId === record.id;
            const currentProgress = currentTimeMap[record.id] || 0;
            const progressRatio = record.duration > 0 ? currentProgress / record.duration : 0;
            const isExpanded = !!expandedTextIds[record.id];
            const isEditingTitle = editingTitleId === record.id;

            return (
              <div
                key={record.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition space-y-4 shadow-lg group"
              >
                {/* Top Row: Title, Date, Actions */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditedTitle(record.id)}
                            className="bg-slate-900 border border-emerald-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEditedTitle(record.id)}
                            className="px-2 py-1 bg-emerald-500 text-slate-950 rounded-lg text-[10px] font-bold"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition">
                            {record.title}
                          </h4>
                          <button
                            onClick={() => startEditingTitle(record)}
                            title="Renommer ce titre"
                            className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition p-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {record.voiceType === 'cloned' ? 'Voix Clonée' : 'Voix Pro'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatCreationDate(record.timestamp)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-emerald-400">
                        <Clock className="w-3.5 h-3.5" />
                        {record.duration.toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  {/* Top Right Quick Actions: Replay, Modify, Export */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Modify Button: Restores into editor */}
                    <button
                      onClick={() => onModifyRecord(record)}
                      title="Charger ce texte et ces paramètres dans le studio pour modification"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700 active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Modifier dans le studio</span>
                    </button>

                    {/* Download MP3 */}
                    <button
                      onClick={() => handleDownloadMp3(record)}
                      title="Télécharger à nouveau en MP3 haute fidélité"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition flex items-center gap-1.5 active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>MP3</span>
                    </button>

                    {/* Download WAV */}
                    <button
                      onClick={() => handleDownloadWav(record)}
                      title="Télécharger la version studio lossless .WAV"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium transition active:scale-95"
                    >
                      <span>WAV</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteRecord(record.id)}
                      title="Supprimer définitivement de l'historique"
                      className="p-1.5 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Original Text Display */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 relative group/text">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-emerald-400" />
                      Texte original ({record.originalText.length} car.)
                    </span>

                    <button
                      onClick={() => handleCopyText(record.id, record.originalText)}
                      title="Copier le texte"
                      className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                    >
                      {copiedId === record.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className={`leading-relaxed italic ${!isExpanded ? 'line-clamp-2' : ''}`}>
                    « {record.originalText} »
                  </p>

                  {record.originalText.length > 120 && (
                    <button
                      onClick={() => toggleTextExpanded(record.id)}
                      className="mt-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5"
                    >
                      {isExpanded ? (
                        <>
                          <span>Réduire</span>
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>Lire la suite</span>
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Voice Parameters Used Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {/* Voice badge */}
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Voix : <strong>{record.voiceName}</strong></span>
                  </div>

                  {/* Débit badge */}
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                    <span className="text-slate-500">Débit :</span>
                    <span className="font-mono font-semibold text-emerald-400">{record.rate}x</span>
                  </div>

                  {/* Tonalité badge */}
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                    <span className="text-slate-500">Tonalité :</span>
                    <span className="font-mono font-semibold text-cyan-400">
                      {record.pitch === 0 ? '0 (Standard)' : `${record.pitch > 0 ? `+${record.pitch}` : record.pitch} demi-tons`}
                    </span>
                  </div>

                  {/* Style tag */}
                  {record.style && (
                    <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-1 truncate max-w-xs">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span className="truncate">{record.style}</span>
                    </div>
                  )}

                  {/* Language */}
                  <div className="px-2 py-1 rounded-lg bg-slate-900 text-slate-400 text-[11px] uppercase font-mono">
                    {record.language || 'FR'}
                  </div>
                </div>

                {/* Inline Player Bar for Instant Listening */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => handleTogglePlayInline(record)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-md shrink-0 ${
                      isPlaying
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  {/* Progress scrubber bar */}
                  <div
                    onClick={(e) => handleSeekInline(record.id, record.duration, e)}
                    className="flex-1 h-3 bg-slate-900 rounded-full cursor-pointer relative overflow-hidden border border-slate-800"
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-100"
                      style={{ width: `${progressRatio * 100}%` }}
                    />
                  </div>

                  {/* Time indicator */}
                  <div className="font-mono text-[11px] text-slate-400 shrink-0">
                    <span className="text-emerald-400">{formatTime(currentProgress)}</span> / {formatTime(record.duration)}
                  </div>

                  {/* Open in main studio player */}
                  <button
                    onClick={() => onPlayInMasterPlayer(record)}
                    title="Ouvrir dans le lecteur master principal"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition"
                  >
                    Vue Waveform
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
