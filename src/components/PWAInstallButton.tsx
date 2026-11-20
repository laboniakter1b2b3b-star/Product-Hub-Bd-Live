import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Install PRODUCT HUB BD as an app on your device"
        className="flex items-center gap-1.5 rounded-lg border border-[#0F6E56]/40 dark:border-[#14B8A6]/40 bg-[#0F6E56]/10 dark:bg-[#14B8A6]/10 px-2.5 py-1.5 text-xs font-semibold text-[#0F6E56] dark:text-[#14B8A6] hover:bg-[#0F6E56] hover:text-white dark:hover:bg-[#14B8A6] dark:hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className={compact ? 'hidden md:inline' : ''}>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-[#14B8A6] whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className={compact ? 'hidden md:inline' : ''}>Add App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl space-y-3">
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Add to iPhone / iPad Home Screen
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> so you can return to{' '}
                <strong>PRODUCT HUB BD</strong> anytime in one tap.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] py-2 text-xs font-semibold text-white dark:text-zinc-950"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-lg no-print">
      <span className="h-2 w-2 rounded-full bg-zinc-950 animate-pulse" />
      Offline Mode — Viewing cached store data
    </div>
  );
};
