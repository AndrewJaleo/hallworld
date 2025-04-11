import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelectLanguage: (language: string) => void;
}

export function LanguageSelector({ selectedLanguage, onSelectLanguage }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // List of supported languages
  const languages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Russian',
    'Chinese',
    'Japanese',
    'Korean',
    'Arabic'
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 px-3 py-1 shadow-[0_2px_5px_rgba(31,38,135,0.1)] flex items-center gap-1 text-xs text-cyan-300"
      >
        <span>{selectedLanguage}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 z-50 w-40 rounded-xl bg-cyan-900/90 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15)] overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {languages.map((language) => (
              <button
                key={language}
                onClick={() => {
                  onSelectLanguage(language);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs ${
                  language === selectedLanguage
                    ? 'bg-cyan-700/50 text-cyan-200'
                    : 'text-cyan-300 hover:bg-cyan-800/50'
                }`}
              >
                {language}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
