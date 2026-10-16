import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPreferences, AppLanguage, DifficultyLevel } from '../../types';
import { savePreferences, resetProgress } from '../../services/storageService';
import { BigActionButton } from '../../components/BigActionButton';
import { ArrowLeft, ArrowRight, ShieldCheck, RefreshCw, Volume2, Mic, Settings } from 'lucide-react';

interface ParentSettingsProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: UserPreferences) => void;
  onClose: () => void;
  lang: AppLanguage;
  onResetProgressDone: () => void;
}

export const ParentSettings: React.FC<ParentSettingsProps> = ({
  preferences,
  onUpdatePreferences,
  onClose,
  lang,
  onResetProgressDone,
}) => {
  const isRtl = lang === 'ar' || lang === 'ary';

  // Parental Gate Challenge (e.g. 4 + 3 = ?)
  const [numA] = useState(() => Math.floor(Math.random() * 5) + 3);
  const [numB] = useState(() => Math.floor(Math.random() * 5) + 2);
  const [gateAnswer, setGateAnswer] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [gateError, setGateError] = useState(false);

  const [localPrefs, setLocalPrefs] = useState<UserPreferences>({ ...preferences });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const verifyGate = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(gateAnswer, 10) === numA + numB) {
      setIsUnlocked(true);
      setGateError(false);
    } else {
      setGateError(true);
      setGateAnswer('');
    }
  };

  const handleSave = () => {
    savePreferences(localPrefs);
    onUpdatePreferences(localPrefs);
    onClose();
  };

  const handleResetProgress = () => {
    resetProgress();
    onResetProgressDone();
    setShowResetConfirm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 border-amber-300 max-h-[90vh] overflow-y-auto"
      >
        {!isUnlocked ? (
          /* Parental Gate Screen */
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-amber-100 rounded-full text-amber-800">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 font-rounded">
              Espace Réservé aux Parents 🔒
            </h2>
            <p className="text-sm text-slate-600">
              Pour accéder aux réglages, veuillez résoudre cette addition simple :
            </p>

            <form onSubmit={verifyGate} className="space-y-4 w-full max-w-xs">
              <div className="text-3xl font-black text-amber-900 bg-amber-50 py-3 rounded-2xl border-2 border-amber-200">
                {numA} + {numB} = ?
              </div>
              <input
                type="number"
                value={gateAnswer}
                onChange={(e) => setGateAnswer(e.target.value)}
                placeholder="Votre réponse"
                className="w-full text-center text-2xl font-bold py-2.5 px-4 rounded-xl border-2 border-slate-300 focus:border-amber-500 focus:outline-none"
                autoFocus
              />
              {gateError && (
                <p className="text-sm font-bold text-rose-500">
                  Réponse incorrecte, veuillez réessayer.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Settings Form */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Settings className="w-7 h-7 text-amber-600" />
                <h2 className="text-2xl font-black text-slate-800 font-rounded">
                  Paramètres Parents ⚙️
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Langue par défaut
              </label>
              <select
                value={localPrefs.defaultLanguage}
                onChange={(e) =>
                  setLocalPrefs({
                    ...localPrefs,
                    defaultLanguage: e.target.value as AppLanguage,
                  })
                }
                className="w-full p-3 rounded-xl border-2 border-slate-300 font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="fr">Français 🇫🇷</option>
                <option value="ar">العربية (Arabe standard) 🌟</option>
                <option value="ary">الدارجة المغربية (Darija marocaine) 🇲🇦</option>
              </select>
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Niveau de tolérance vocale
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLocalPrefs({ ...localPrefs, difficultyLevel: lvl })}
                    className={`py-2 px-3 rounded-xl font-bold text-sm transition-all border-2 ${
                      localPrefs.difficultyLevel === lvl
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lvl === 'easy' ? 'Facile (4 ans)' : lvl === 'medium' ? 'Moyen' : 'Difficile'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Le mode Facile est recommandé pour Imrane (4 ans), acceptant les approximations
                naturelles.
              </p>
            </div>

            {/* Speech Recognition Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <Mic className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">Reconnaissance vocale</p>
                  <p className="text-xs text-slate-500">
                    Activer le microphone pour écouter la répétition
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localPrefs.speechRecognitionEnabled}
                onChange={(e) =>
                  setLocalPrefs({
                    ...localPrefs,
                    speechRecognitionEnabled: e.target.checked,
                  })
                }
                className="w-5 h-5 accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Auto Advance Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-800 text-sm">Passage automatique</p>
                <p className="text-xs text-slate-500">
                  Passer au mot suivant après un succès
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPrefs.autoAdvance}
                onChange={(e) =>
                  setLocalPrefs({ ...localPrefs, autoAdvance: e.target.checked })
                }
                className="w-5 h-5 accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Automatic Word Repetition Interval */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-slate-800">
                  Répétition audio automatique
                </span>
                <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  {(localPrefs.wordRepeatIntervalSeconds ?? 4) === 0
                    ? 'Désactivée'
                    : `Toutes les ${localPrefs.wordRepeatIntervalSeconds ?? 4}s`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[
                  { sec: 4, label: '4s (Actif)' },
                  { sec: 6, label: '6s' },
                  { sec: 8, label: '8s' },
                  { sec: 0, label: 'Arrêt' },
                ].map(({ sec, label }) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      setLocalPrefs({ ...localPrefs, wordRepeatIntervalSeconds: sec })
                    }
                    className={`py-1.5 px-2 rounded-xl font-bold text-xs transition-all border-2 ${
                      (localPrefs.wordRepeatIntervalSeconds ?? 4) === sec
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Répète le mot toutes les 4 secondes pour immerger Imrane et l'encourager à répéter.
              </p>
            </div>

            {/* Volume */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-slate-700 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>Volume sonore</span>
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {Math.round(localPrefs.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localPrefs.volume}
                onChange={(e) =>
                  setLocalPrefs({ ...localPrefs, volume: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Pronunciation Speed (Ralenti pédagogique pour l'enfant de 4 ans) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <span>Vitesse de lecture (Ralenti)</span>
                </label>
                <span className="text-xs font-extrabold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full">
                  {(localPrefs.speechSpeed || 0.75).toFixed(2)}x
                </span>
              </div>

              {/* Slider */}
              <div className="flex items-center space-x-3 rtl:space-x-reverse my-2">
                <span className="text-lg select-none" title="Très lent">🐢</span>
                <input
                  type="range"
                  min="0.55"
                  max="1.00"
                  step="0.05"
                  value={localPrefs.speechSpeed || 0.75}
                  onChange={(e) =>
                    setLocalPrefs({
                      ...localPrefs,
                      speechSpeed: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <span className="text-lg select-none" title="Normal">🐇</span>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { speed: 0.65, label: '0.65x Très lent' },
                  { speed: 0.75, label: '0.75x Recommandé' },
                  { speed: 0.90, label: '0.90x Normal' },
                ].map(({ speed, label }) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setLocalPrefs({ ...localPrefs, speechSpeed: speed })}
                    className={`py-1.5 px-2 rounded-xl font-bold text-xs transition-all border-2 ${
                      Math.abs((localPrefs.speechSpeed || 0.75) - speed) < 0.02
                        ? 'bg-teal-500 text-white border-teal-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                La prononciation ralentie et articulée aide Imrane à bien distinguer les syllabes et sons du mot.
              </p>
            </div>

            {/* Max Retries */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Nombre maximum d'essais avant félicitations
              </label>
              <select
                value={localPrefs.maxRetries}
                onChange={(e) =>
                  setLocalPrefs({
                    ...localPrefs,
                    maxRetries: parseInt(e.target.value, 10),
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800"
              >
                <option value={2}>2 tentatives (encouragement rapide)</option>
                <option value={3}>3 tentatives</option>
              </select>
            </div>

            {/* Reset Progress */}
            <div className="pt-2 border-t">
              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center space-x-2 rtl:space-x-reverse text-xs font-bold text-rose-600 hover:text-rose-800"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Réinitialiser la progression et les étoiles</span>
                </button>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-rose-800">
                    Voulez-vous vraiment remettre à zéro les étoiles gagnées par Imrane ?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResetProgress}
                      className="py-1 px-3 bg-rose-600 text-white rounded-lg text-xs font-extrabold"
                    >
                      Oui, réinitialiser
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="py-1 px-3 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl"
              >
                Fermer
              </button>
              <BigActionButton
                label="Enregistrer"
                onClick={handleSave}
                variant="primary"
                size="md"
                className="flex-1"
                icon={isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
