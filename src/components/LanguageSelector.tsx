import React from 'react';
import { AppLanguage } from '../types';
import { motion } from 'framer-motion';

interface LanguageSelectorProps {
  currentLanguage: AppLanguage;
  onSelectLanguage: (lang: AppLanguage) => void;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onSelectLanguage,
  className = '',
}) => {
  const languages: { code: AppLanguage; label: string; flag: string; badge: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷', badge: 'FR' },
    { code: 'ar', label: 'العربية', flag: '🌟', badge: 'AR' },
    { code: 'ary', label: 'الدارجة المغربية', flag: '🇲🇦', badge: 'DARIJA' },
  ];

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 ${className}`}>
      {languages.map((lang) => {
        const isSelected = currentLanguage === lang.code;
        return (
          <motion.button
            key={lang.code}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectLanguage(lang.code)}
            aria-pressed={isSelected}
            className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl font-extrabold text-sm sm:text-base transition-all shadow-md ${
              isSelected
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white ring-4 ring-teal-200 shadow-teal-300/40'
                : 'bg-white/90 hover:bg-white text-slate-700 hover:text-teal-700 border-2 border-slate-200'
            }`}
          >
            <span className="text-xl sm:text-2xl">{lang.flag}</span>
            <span>{lang.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
