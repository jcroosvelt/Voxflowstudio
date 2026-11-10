import React, { useState, useRef } from 'react';
import {
  Mic,
  Sparkles,
  Volume2,
  Trash2,
  Check,
  User,
  Radio,
  Play,
  Pause,
  ChevronDown,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { VoicePreset, ClonedVoiceProfile } from '../types';
import { PRESET_VOICES } from '../data/presets';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string, isCloned: boolean, profile?: ClonedVoiceProfile) => void;
  clonedVoices: ClonedVoiceProfile[];
  onDeleteClone: (id: string) => void;
  onOpenCloneModal: () => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onSelectVoice,
  clonedVoices,
  onDeleteClone,
  onOpenCloneModal,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'clones'>('presets');
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous');
  const [playingPreviewVoiceId, setPlayingPreviewVoiceId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const categories = [
    'Tous',
    'Créole & Caraïbes',
    'Français Métropolitain',
    'Publicité',
    'Journalisme & Reportage',
    'Documentaire',
    'Livre audio & Romance',
    'Cinéma & Gaming',
    'Podcast',
  ];

  const filteredPresets = PRESET_VOICES.filter((voice) => {
    if (categoryFilter === 'Tous') return true;
    if (categoryFilter === 'Créole & Caraïbes') {
      return voice.tags.some(t => t.toLowerCase().includes('créole') || t.toLowerCase().includes('caraïbes') || t.toLowerCase().includes('haïti'));
    }
    if (categoryFilter === 'Français Métropolitain') {
      return !voice.tags.some(t => t.toLowerCase().includes('créole') || t.toLowerCase().includes('haïti'));
    }
    if (categoryFilter === 'Publicité') {
      return voice.category === 'Publicité' || voice.tags.includes('Publicité') || voice.tags.includes('TikTok') || voice.tags.includes('Commercial');
    }
    if (categoryFilter === 'Journalisme & Reportage') {
      return voice.category === 'Journalisme & Reportage' || voice.tags.includes('Journalisme') || voice.tags.includes('Reportage') || voice.tags.includes('Actualité');
    }
    if (categoryFilter === 'Livre audio & Romance') {
      return voice.category === 'Luxe & Douceur' || voice.tags.includes('Livre audio') || voice.tags.includes('Romance') || voice.tags.includes('Poésie');
    }
    if (categoryFilter === 'Cinéma & Gaming') {
      return voice.category === 'Cinéma' || voice.tags.includes('Gaming') || voice.tags.includes('Bande-annonce');
    }
    if (voice.category === categoryFilter) return true;
    return false;
  });

  // Find currently selected voice info for summary
  const selectedPreset = PRESET_VOICES.find((v) => v.id === selectedVoiceId);
  const selectedClone = clonedVoices.find((c) => c.id === selectedVoiceId);
  const currentVoiceName = selectedPreset?.name || selectedClone?.name || 'Léa';

  // Quick Voice Preview using Web Speech or Server TTS preview
  const handlePlayVoicePreview = (e: React.MouseEvent, voice: VoicePreset) => {
    e.stopPropagation();

    if (playingPreviewVoiceId === voice.id) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPlayingPreviewVoiceId(null);
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setPlayingPreviewVoiceId(voice.id);

      const previewPhrases: Record<string, string> = {
        'garry-creole-pub': "Pa rate sa ! Mwen se Garry. Une voix créole haïtienne percutante, souriante et dynamique pour booster vos publicités et vos offres promotionnelles !",
        'nadege-creole-news': "Bonjou, bonswa tout moun. Mwen se Nadège. Une voix créole haïtienne posée, claire et crédible pour vos reportages, journaux d'information et chroniques d'actualité.",
        'dany-creole-lodyans': "Krik ! Krak ! Mwen se Dany. Voix de conteur traditionnel haïtien pour faire vibrer vos récits au son de nos mémoires et nos lodyans.",
        'fabienne-creole-tech': "Bonjou tout moun ! Mwen se Fabienne. Une voix dynamique et moderne pour inspirer l'entrepreneuriat caribéen et l'innovation technologique.",
        'kensley-creole-radio': "Woy woy woy ! Mwen se Kensley. Branché sur la fréquence urbaine et musicale, pour un son kompa et des chroniques festives pleines d'énergie !",
        'roseline-creole-sante': "Bonjou chè zanmi. Mwen se Roseline. Une voix douce, claire et bienveillante au service de la santé, de l'éducation et du vivre-ensemble.",
        'ticlaude-creole-humour': "Alo alo tout moun ! Mwen se Ti-Claude. Un brin d'esprit, des réparties piquantes et le sourire haïtien pour animer tous vos contenus !",
        'mireille-creole': "Bonswa tout moun ! Mwen se Mireille. Une voix féminine au bel accent créole haïtien, solaire, claire et chaleureuse.",
        'jean-baptiste-creole': "Onè, respè ! Mwen se Jean-Baptiste. Une voix créole haïtienne authentique, claire et posée pour porter tous vos messages.",
        'lea-doc': "Bonjour, je suis Léa. Ma voix est posée et chaleureuse pour vos documentaires et récits.",
        'thomas-pub': "Salut ! Je suis Thomas. Donnons une énergie percutante et dynamique à votre publicité !",
        'chloe-social': "Coucou tout le monde ! Je suis Chloé, la voix jeune et pétillante pour vos vidéos TikTok, Reels et Shorts !",
        'patrick-corporate': "Bonjour. Je suis Patrick. Une voix institutionnelle et posée pour valoriser vos bilans et présentations stratégiques.",
        'manon-romance': "Fermez les yeux et écoutez... Je suis Manon, votre voix douce et poétique pour les romans et livres audio.",
        'emile-histoire': "À travers le temps et la mémoire... Je suis Émile. Une voix d'aîné digne et solennelle pour honorer les grands récits.",
        'julien-gaming': "Préparez vos armes, l'aventure commence ! Je suis Julien, pour vos bandes-annonces de jeux et cinématiques héroïques.",
        'marc-cinema': "Dans un monde où chaque souffle compte... Je suis Marc, votre voix cinématographique.",
        'sophie-learning': "Bonjour et bienvenue. Je suis Sophie, à votre service pour un apprentissage clair et pédagogique.",
        'camille-podcast': "Prenez une grande inspiration. Je suis Camille, pour vos moments d'écoute intimes et apaisants.",
        'alexandre-story': "L'élégance du verbe et la finesse du récit. Je suis Alexandre, au service de vos créations d'exception.",
      };

      const phrase = previewPhrases[voice.id] || `Bonjour, je suis ${voice.name}, prêt pour votre projet audio.`;
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = 'fr-FR';
      utterance.rate = voice.rate;
      utterance.pitch = Math.max(0.5, Math.min(1.8, 1 + voice.pitch * 0.1));

      const voices = window.speechSynthesis.getVoices();
      const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
      if (frenchVoices.length > 0) {
        if (voice.gender === 'Masculin') {
          const maleVoice = frenchVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('thomas') || v.name.toLowerCase().includes('paul') || v.name.toLowerCase().includes('nicolas'));
          utterance.voice = maleVoice || frenchVoices[0];
        } else {
          const femaleVoice = frenchVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('amélie') || v.name.toLowerCase().includes('marie') || v.name.toLowerCase().includes('audrey') || v.name.toLowerCase().includes('julie'));
          utterance.voice = femaleVoice || frenchVoices[0];
        }
      }

      utterance.onend = () => setPlayingPreviewVoiceId(null);
      utterance.onerror = () => setPlayingPreviewVoiceId(null);

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-5">
      {/* Header with Title, Quick Dropdown Selector & Clone Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Comédiens & Voix Off</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active : {currentVoiceName}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cliquez sur une voix pour l'activer immédiatement dans votre studio
              </p>
            </div>
          </div>
        </div>

        {/* Quick Dropdown Select + Tab Switcher + Clone Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Direct Dropdown Selector for instant switching */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500 font-medium">Menu rapide :</span>
            <select
              value={selectedVoiceId}
              onChange={(e) => {
                const targetId = e.target.value;
                const isClone = clonedVoices.some(c => c.id === targetId);
                if (isClone) {
                  const clone = clonedVoices.find(c => c.id === targetId);
                  onSelectVoice(targetId, true, clone);
                } else {
                  onSelectVoice(targetId, false);
                }
              }}
              className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer pr-1"
            >
              <optgroup label="Voix Créoles d'Haïti & Caraïbes">
                {PRESET_VOICES.filter(v => v.tags.some(t => t.toLowerCase().includes('créole') || t.toLowerCase().includes('haïti'))).map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                    🌴 {v.name} ({v.gender} • {v.category})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Voix Françaises Métropolitaines">
                {PRESET_VOICES.filter(v => !v.tags.some(t => t.toLowerCase().includes('créole') || t.toLowerCase().includes('haïti'))).map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                    🎙 {v.name} ({v.gender} • {v.category})
                  </option>
                ))}
              </optgroup>
              {clonedVoices.length > 0 && (
                <optgroup label="Mes Voix Clonées">
                  {clonedVoices.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                      ★ {c.name} (Clonée)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'presets'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Voix Pro ({PRESET_VOICES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clones')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'clones'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Clonées ({clonedVoices.length})</span>
              {clonedVoices.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* New Clone Button */}
          <button
            type="button"
            onClick={onOpenCloneModal}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cloner une voix</span>
          </button>
        </div>
      </div>

      {/* Preset Category Pills (only when in presets tab) */}
      {activeTab === 'presets' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold uppercase text-slate-500 shrink-0">Filtrer par genre :</span>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition font-medium ${
                categoryFilter === cat
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Preset Voices Grid */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map((voice) => {
            const isSelected = selectedVoiceId === voice.id;
            const isPreviewing = playingPreviewVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectVoice(voice.id, false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectVoice(voice.id, false);
                  }
                }}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between text-left select-none outline-none ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-400 ring-4 ring-emerald-500/20 shadow-xl shadow-emerald-950/50'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner ${
                          voice.gender === 'Féminin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {voice.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          {voice.name}
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({voice.gender})
                          </span>
                        </div>
                        <div className="text-xs text-emerald-400 font-semibold">
                          {voice.category}
                        </div>
                      </div>
                    </div>

                    {/* Audio Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePlayVoicePreview(e, voice)}
                      title="Écouter un extrait audio de cette voix"
                      className={`p-2 rounded-xl transition flex items-center gap-1 text-[11px] font-semibold border ${
                        isPreviewing
                          ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
                      }`}
                    >
                      {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isPreviewing ? 'Stop' : 'Extrait'}</span>
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300/90 leading-relaxed mt-2">
                    {voice.description}
                  </p>
                </div>

                {/* Footer with tags and action button */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {voice.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Explicit Select Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVoice(voice.id, false);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
                      isSelected
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Voix actuellement sélectionnée</span>
                      </>
                    ) : (
                      <>
                        <span>Sélectionner {voice.name}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cloned Voices List */}
      {activeTab === 'clones' && (
        <div>
          {clonedVoices.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">
                  Aucune voix clonée pour le moment
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Enregistrez votre propre voix au microphone ou téléversez un extrait audio pour créer une réplique vocale fidèle.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCloneModal}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Créer mon premier clone vocal</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clonedVoices.map((clone) => {
                const isSelected = selectedVoiceId === clone.id;
                return (
                  <div
                    key={clone.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectVoice(clone.id, true, clone)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectVoice(clone.id, true, clone);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between text-left select-none outline-none ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-400 ring-4 ring-emerald-500/20 shadow-xl shadow-emerald-950/50'
                        : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shadow-inner">
                            <Radio className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                              {clone.name}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                                Clonée
                              </span>
                            </div>
                            <div className="text-xs text-emerald-400 font-semibold">
                              {clone.vocalRange} • {clone.timbre}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Supprimer la voix clonée « ${clone.name} » ?`)) {
                              onDeleteClone(clone.id);
                            }
                          }}
                          title="Supprimer cette voix clonée"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 italic bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 line-clamp-2 mt-2">
                        « {clone.analysisSummary} »
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {clone.characteristics.map((c, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium"
                          >
                            #{c}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVoice(clone.id, true, clone);
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
                          isSelected
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Voix active</span>
                          </>
                        ) : (
                          <>
                            <span>Sélectionner {clone.name}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
