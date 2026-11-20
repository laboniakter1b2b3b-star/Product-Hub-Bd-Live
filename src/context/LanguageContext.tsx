import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  LANG_STORAGE_KEY,
  detectBrowserLanguage,
  loadLocalTranslationCache,
  lookupStaticTranslation,
  needsTranslationForTarget,
  saveLocalTranslationCache,
  shouldSkipTranslation,
  type LanguageMode,
  type ResolvedLanguage,
} from '../lib/autoTranslate.ts';

interface LanguageContextValue {
  langMode: LanguageMode;
  resolvedLang: ResolvedLanguage;
  setLangMode: (mode: LanguageMode) => void;
  toggleQuickLanguage: () => void;
  translating: boolean;
  t: (englishText: string, banglaText?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'SVG', 'TEXTAREA']);

function shouldSkipNode(node: Node | null): boolean {
  let curr: Node | null = node;
  while (curr) {
    if (curr instanceof Element) {
      if (SKIP_TAGS.has(curr.tagName)) return true;
      if (curr.getAttribute('data-no-translate') === 'true') return true;
      if (curr instanceof HTMLElement && curr.isContentEditable) return true;
    }
    curr = curr.parentNode;
  }
  return false;
}

export function LanguageProvider({
  children,
  defaultSiteLanguage,
}: {
  children: React.ReactNode;
  defaultSiteLanguage?: string;
}) {
  const [langMode, setLangModeState] = useState<LanguageMode>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'bn' || saved === 'en' || saved === 'auto') return saved;
    return 'auto';
  });

  const [browserLang, setBrowserLang] = useState<ResolvedLanguage>(() => detectBrowserLanguage());
  const [translating, setTranslating] = useState(false);

  // Determine effective language
  const hasExplicitUserChoice = (() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'bn' || saved === 'en';
  })();

  const resolvedLang: ResolvedLanguage = (() => {
    if (langMode === 'bn' || langMode === 'en') return langMode;
    if (!hasExplicitUserChoice && (defaultSiteLanguage === 'bn' || defaultSiteLanguage === 'en')) {
      return defaultSiteLanguage;
    }
    return browserLang;
  })();

  const setLangMode = useCallback((mode: LanguageMode) => {
    localStorage.setItem(LANG_STORAGE_KEY, mode);
    setLangModeState(mode);
  }, []);

  const toggleQuickLanguage = useCallback(() => {
    setLangModeState((prev) => {
      const next: LanguageMode = prev === 'auto' ? 'bn' : prev === 'bn' ? 'en' : 'bn';
      localStorage.setItem(LANG_STORAGE_KEY, next);
      return next;
    });
  }, []);

  // Listen to browser language changes if in auto mode
  useEffect(() => {
    const handleLangChange = () => setBrowserLang(detectBrowserLanguage());
    window.addEventListener('languagechange', handleLangChange);
    return () => window.removeEventListener('languagechange', handleLangChange);
  }, []);

  // Keep <html lang="..."> updated
  useEffect(() => {
    document.documentElement.lang = resolvedLang;
  }, [resolvedLang]);

  // Persistent WeakMaps & caches so React DOM structure is NEVER altered
  const originalTextMapRef = useRef(new WeakMap<Text, string>());
  const appliedTextMapRef = useRef(new WeakMap<Text, string>());
  const originalPlaceholderMapRef = useRef(new WeakMap<Element, string>());
  const appliedPlaceholderMapRef = useRef(new WeakMap<Element, string>());
  const cacheRef = useRef<Record<string, string>>(loadLocalTranslationCache());
  const pendingTextsRef = useRef<Set<string>>(new Set());
  const inflightTextsRef = useRef<Set<string>>(new Set());
  const batchTimerRef = useRef<number | null>(null);
  const resolvedLangRef = useRef<ResolvedLanguage>(resolvedLang);
  resolvedLangRef.current = resolvedLang;

  const getCachedTranslation = useCallback((core: string, target: ResolvedLanguage): string | null => {
    const staticHit = lookupStaticTranslation(core, target);
    if (staticHit) return staticHit;
    const cacheKey = `${target}:${core}`;
    return cacheRef.current[cacheKey] ?? null;
  }, []);

  const applyTranslationToTextNode = useCallback(
    (node: Text, target: ResolvedLanguage, queueMissing: boolean) => {
      if (!node.isConnected || shouldSkipNode(node.parentNode)) return;

      const currentVal = node.nodeValue ?? '';
      const lastApplied = appliedTextMapRef.current.get(node);
      if (lastApplied === undefined || currentVal !== lastApplied) {
        originalTextMapRef.current.set(node, currentVal);
      }

      const orig = originalTextMapRef.current.get(node) ?? currentVal;
      const match = orig.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (!match) return;

      const [, lead, core, trail] = match;
      if (!core || shouldSkipTranslation(core)) return;

      if (!needsTranslationForTarget(core, target)) {
        if (currentVal !== orig) {
          appliedTextMapRef.current.set(node, orig);
          node.nodeValue = orig;
        }
        return;
      }

      const hit = getCachedTranslation(core, target);
      if (hit) {
        const nextVal = `${lead}${hit}${trail}`;
        if (currentVal !== nextVal) {
          appliedTextMapRef.current.set(node, nextVal);
          node.nodeValue = nextVal;
        }
      } else if (queueMissing && !inflightTextsRef.current.has(`${target}:${core}`)) {
        pendingTextsRef.current.add(core);
      }
    },
    [getCachedTranslation]
  );

  const applyTranslationToPlaceholder = useCallback(
    (el: Element, target: ResolvedLanguage, queueMissing: boolean) => {
      if (!el.isConnected || shouldSkipNode(el)) return;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      const currentPlaceholder = el.getAttribute('placeholder') ?? '';
      if (!currentPlaceholder) return;

      const lastApplied = appliedPlaceholderMapRef.current.get(el);
      if (lastApplied === undefined || currentPlaceholder !== lastApplied) {
        originalPlaceholderMapRef.current.set(el, currentPlaceholder);
      }

      const orig = originalPlaceholderMapRef.current.get(el) ?? currentPlaceholder;
      const core = orig.trim();
      if (!core || shouldSkipTranslation(core)) return;

      if (!needsTranslationForTarget(core, target)) {
        if (currentPlaceholder !== orig) {
          appliedPlaceholderMapRef.current.set(el, orig);
          el.setAttribute('placeholder', orig);
        }
        return;
      }

      const hit = getCachedTranslation(core, target);
      if (hit) {
        if (currentPlaceholder !== hit) {
          appliedPlaceholderMapRef.current.set(el, hit);
          el.setAttribute('placeholder', hit);
        }
      } else if (queueMissing && !inflightTextsRef.current.has(`${target}:${core}`)) {
        pendingTextsRef.current.add(core);
      }
    },
    [getCachedTranslation]
  );

  const flushBatchRef = useRef<(() => void) | null>(null);

  const scanSubtree = useCallback(
    (root: Node, target: ResolvedLanguage, queueMissing = true) => {
      if (shouldSkipNode(root)) return;

      if (root.nodeType === Node.TEXT_NODE) {
        applyTranslationToTextNode(root as Text, target, queueMissing);
        return;
      }

      if (root instanceof Element) {
        if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement) {
          applyTranslationToPlaceholder(root, target, queueMissing);
        }
        const placeholders = root.querySelectorAll('input[placeholder], textarea[placeholder]');
        placeholders.forEach((el) => applyTranslationToPlaceholder(el, target, queueMissing));
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        applyTranslationToTextNode(current as Text, target, queueMissing);
        current = walker.nextNode();
      }

      if (queueMissing && pendingTextsRef.current.size > 0 && flushBatchRef.current) {
        flushBatchRef.current();
      }
    },
    [applyTranslationToPlaceholder, applyTranslationToTextNode]
  );

  const scheduleBatchTranslate = useCallback(() => {
    if (batchTimerRef.current !== null) return;
    batchTimerRef.current = window.setTimeout(async () => {
      batchTimerRef.current = null;
      const target = resolvedLangRef.current;
      const batch = Array.from(pendingTextsRef.current).slice(0, 50);
      if (batch.length === 0) return;

      for (const item of batch) {
        pendingTextsRef.current.delete(item);
        inflightTextsRef.current.add(`${target}:${item}`);
      }

      setTranslating(true);
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: batch, target }),
        });
        if (res.ok) {
          const data = (await res.json()) as { translations?: Record<string, string> };
          const map = data.translations || {};
          for (const [src, translated] of Object.entries(map)) {
            if (translated) {
              cacheRef.current[`${target}:${src}`] = translated;
            }
          }
          saveLocalTranslationCache(cacheRef.current);
          if (document.body) {
            scanSubtree(document.body, resolvedLangRef.current, false);
          }
        }
      } catch {
        // Ignore transient offline/network error
      } finally {
        for (const item of batch) {
          inflightTextsRef.current.delete(`${target}:${item}`);
        }
        setTranslating(pendingTextsRef.current.size > 0);
        if (pendingTextsRef.current.size > 0) {
          scheduleBatchTranslate();
        }
      }
    }, 80);
  }, [scanSubtree]);

  flushBatchRef.current = scheduleBatchTranslate;

  // Observe DOM mutations & re-apply whenever language changes
  useEffect(() => {
    if (!document.body) return;
    pendingTextsRef.current.clear();
    scanSubtree(document.body, resolvedLang, true);

    const observer = new MutationObserver((mutations) => {
      const target = resolvedLangRef.current;
      for (const m of mutations) {
        if (m.type === 'characterData') {
          if (m.target.nodeType === Node.TEXT_NODE) {
            applyTranslationToTextNode(m.target as Text, target, true);
          }
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((added) => {
            scanSubtree(added, target, true);
          });
        } else if (m.type === 'attributes' && m.attributeName === 'placeholder' && m.target instanceof Element) {
          applyTranslationToPlaceholder(m.target, target, true);
        }
      }

      if (pendingTextsRef.current.size > 0) {
        scheduleBatchTranslate();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder'],
    });

    return () => {
      observer.disconnect();
      if (batchTimerRef.current !== null) {
        window.clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    };
  }, [resolvedLang, scanSubtree, applyTranslationToTextNode, applyTranslationToPlaceholder, scheduleBatchTranslate]);

  const t = useCallback(
    (englishText: string, banglaText?: string) => {
      if (resolvedLang === 'en') return englishText;
      if (banglaText) return banglaText;
      return getCachedTranslation(englishText.trim(), 'bn') || englishText;
    },
    [resolvedLang, getCachedTranslation]
  );

  return (
    <LanguageContext.Provider
      value={{
        langMode,
        resolvedLang,
        setLangMode,
        toggleQuickLanguage,
        translating,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
