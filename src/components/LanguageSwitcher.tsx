import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import type { LanguageMode } from '../lib/autoTranslate.ts';

export function LanguageSwitcher({ variant = 'dropdown' }: { variant?: 'dropdown' | 'segmented' }) {
  const { langMode, resolvedLang, setLangMode, translating } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const options: { mode: LanguageMode; label: string; sub: string }[] = [
    {
      mode: 'auto',
      label: 'Auto (অটো)',
      sub: resolvedLang === 'bn' ? 'অটো: বাংলা চালু' : 'Auto: English active',
    },
    {
      mode: 'bn',
      label: 'বাংলা',
      sub: 'অটো বাংলা অনুবাদ',
    },
    {
      mode: 'en',
      label: 'English',
      sub: 'Auto English translate',
    },
  ];

  if (variant === 'segmented') {
    return (
      <div
        data-no-translate="true"
        className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
      >
        {[
          { mode: 'auto' as LanguageMode, label: 'Auto' },
          { mode: 'bn' as LanguageMode, label: 'বাংলা' },
          { mode: 'en' as LanguageMode, label: 'English' },
        ].map((opt) => {
          const active = langMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setLangMode(opt.mode)}
              className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 shadow-sm'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} data-no-translate="true" className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Select language (Auto / Bangla / English)"
        title="Auto Translate: বাংলা / English"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
      >
        {translating ? (
          <Loader2 className="w-3.5 h-3.5 text-[#0F6E56] dark:text-[#14B8A6] animate-spin" />
        ) : (
          <Languages className="w-3.5 h-3.5 text-[#0F6E56] dark:text-[#14B8A6]" />
        )}
        <span>{resolvedLang === 'bn' ? 'বাংলা' : 'EN'}</span>
        {langMode === 'auto' && (
          <span className="hidden sm:inline text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
            Auto
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14171D] shadow-xl py-1.5 z-50">
          <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Auto Translate / ভাষা
            </p>
          </div>
          {options.map((opt) => {
            const active = langMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setLangMode(opt.mode);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors ${
                  active ? 'bg-teal-500/5' : ''
                }`}
              >
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      active ? 'text-[#0F6E56] dark:text-[#14B8A6]' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{opt.sub}</p>
                </div>
                {active && <Check className="w-4 h-4 text-[#0F6E56] dark:text-[#14B8A6] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
