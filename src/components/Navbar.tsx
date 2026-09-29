import React from 'react';
import { Language, User } from '../types';
import { getT } from '../i18n/translations';
import { Globe, ArrowDownToLine, Home, PieChart, Plus, User as UserIcon } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { FinePathLogo } from './FinePathLogo';

interface Props {
  user: User | null;
  lang: Language;
  currentView?: 'home' | 'platform' | 'summary' | 'profile';
  onNavigate?: (view: 'home' | 'summary' | 'profile') => void;
  onOpenAddModal?: () => void;
  onToggleLang: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<Props> = ({
  user,
  lang,
  currentView = 'home',
  onNavigate,
  onOpenAddModal,
  onToggleLang,
  onOpenProfile,
}) => {
  const t = getT(lang);
  const { isInstallable, install } = usePWAInstall();

  return (
    <header className="sticky top-0 z-40 bg-[#002970] text-white shadow-xs border-b border-sky-950">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <button
          type="button"
          onClick={() => onNavigate ? onNavigate('home') : onOpenProfile()}
          className="flex items-center gap-2 sm:gap-2.5 text-left active:scale-98 transition group min-w-0"
        >
          <FinePathLogo size={32} />
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight flex items-center gap-1.5">
              <span className="truncate">{t.appName}</span>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-400/30 shrink-0">
                PRO
              </span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-cyan-200/90 font-medium leading-none truncate mt-0.5">
              {user ? (lang === 'hi' ? user.name : user.name) : t.tagline}
            </p>
          </div>
        </button>

        {/* Desktop / Tablet Nav Links (hidden on mobile, shown on md screens) */}
        {onNavigate && (
          <div className="hidden md:flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                currentView === 'home' || currentView === 'platform'
                  ? 'bg-[#00BAF2] text-[#002970] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t.home}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('summary')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                currentView === 'summary'
                  ? 'bg-[#00BAF2] text-[#002970] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>{t.summary}</span>
            </button>

            {onOpenAddModal && (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="ml-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black shadow-xs flex items-center gap-1 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>{lang === 'hi' ? 'लेन-देन जोड़ें' : 'Add Entry'}</span>
              </button>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Install icon button if available */}
          {isInstallable && (
            <button
              onClick={install}
              title={t.installApp}
              className="p-1 sm:p-1.5 rounded-lg bg-sky-600/40 text-cyan-200 hover:bg-sky-600/70 border border-sky-400/30 transition-all active:scale-95"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Hindi / English Toggle Pill: Single language target label */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] sm:text-xs font-bold transition-all active:scale-95"
            title={lang === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
          >
            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00BAF2]" />
            <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {/* User Avatar / Profile trigger */}
          {user && (
            <button
              onClick={onOpenProfile}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-extrabold text-[11px] sm:text-xs flex items-center justify-center border-2 border-white/40 shadow-xs active:scale-95 transition-transform ${
                currentView === 'profile'
                  ? 'bg-white text-[#002970] ring-2 ring-cyan-300'
                  : 'bg-cyan-400 text-[#002970]'
              }`}
              title={t.profile}
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
