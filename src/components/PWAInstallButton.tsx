import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // If already running standalone as an installed PWA
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>PWA Installée</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow with native deferredPrompt
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
        title="Installer Voxflow sur votre écran d'accueil ou votre ordinateur"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer l'App (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 active:scale-95"
          title="Installer Voxflow sur votre iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Installer PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-100">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Installer sur iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">Accès rapide sans passer par l'App Store</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Appuyez sur le bouton <strong>Partager</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-emerald-400" /> dans la barre inférieure de Safari.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Faites défiler vers le bas et touchez <strong>Sur l'écran d'accueil</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" />.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Confirmez en appuyant sur <strong>Ajouter</strong> en haut à droite.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                J'ai compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop / Other browser: provide informative install guidance button
  return (
    <>
      <button
        onClick={() => setShowInfoModal(true)}
        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 active:scale-95"
        title="Installer Voxflow comme Progressive Web App"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span>Installer PWA</span>
      </button>

      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Installation Progressive Web App</h3>
                <p className="text-xs text-slate-400">Voxflow fonctionne comme une application native</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 leading-relaxed">
              <p>
                Voxflow est une <strong>Progressive Web App (PWA)</strong> installable sur ordinateur (Chrome, Edge) et mobile (Android, iOS).
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                <li><strong className="text-slate-200">Sur Chrome / Edge :</strong> Cliquez sur l'icône d'installation située à droite dans la barre d'adresse du navigateur.</li>
                <li><strong className="text-slate-200">Sur Android :</strong> Ouvrez le menu du navigateur (⋮) puis sélectionnez <em>« Installer l'application »</em> ou <em>« Ajouter à l'écran d'accueil »</em>.</li>
                <li><strong className="text-slate-200">Sur iPhone / iPad :</strong> Touchez <em>Partager</em> puis <em>« Sur l'écran d'accueil »</em> dans Safari.</li>
              </ul>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
