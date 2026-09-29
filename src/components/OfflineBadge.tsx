import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';
import { getT } from '../i18n/translations';
import { syncService } from '../services/backgroundSync';

interface Props {
  lang: Language;
}

export const OfflineBadge: React.FC<Props> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const t = getT(lang);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((count) => {
      setPendingCount(count);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      await syncService.triggerSync();
    } finally {
      setSyncing(false);
    }
  };

  // If online and nothing is queued, render nothing
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all animate-fade-in backdrop-blur-md border border-white/20 bg-slate-900/90 text-white">
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {t.offlineTitle}
            {pendingCount > 0 && ` (${pendingCount} ${t.pendingSyncCount})`}
          </span>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-cyan-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>
              {pendingCount} {t.pendingSyncCount} — {t.syncNow}
            </span>
          </button>
        </>
      )}
    </div>
  );
};
