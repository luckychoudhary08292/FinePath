import React, { useState } from 'react';
import { User, PlatformAccount, Language } from '../types';
import { getT } from '../i18n/translations';
import { ApiClient } from '../services/api';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  Download,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  user: User;
  platforms: PlatformAccount[];
  lang: Language;
  onBack: () => void;
  onLogout: () => void;
  onToggleLang: () => void;
  onRefreshData: () => void;
  onOpenAddPlatform: () => void;
}

export const ProfileSettingsView: React.FC<Props> = ({
  user,
  platforms,
  lang,
  onBack,
  onLogout,
  onToggleLang,
  onRefreshData,
  onOpenAddPlatform,
}) => {
  const t = getT(lang);
  const { isInstallable, install } = usePWAInstall();

  const handleTogglePlatformActive = async (plt: PlatformAccount) => {
    try {
      await ApiClient.updatePlatform(plt.id, { isActive: !plt.isActive });
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlatform = async (pltId: string) => {
    const confirmMsg =
      lang === 'hi'
        ? 'क्या आप वाकई इस प्लेटफ़ॉर्म और इसके सभी लेन-देन को हटाना चाहते हैं?'
        : 'Are you sure you want to remove this platform and all its transactions?';
    if (!window.confirm(confirmMsg)) return;

    try {
      await ApiClient.deletePlatform(pltId);
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-fade-in pb-20 md:pb-10 max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-6">
      {/* Header */}
      <div className="bg-[#002970] px-4 md:px-6 pt-4 pb-6 md:pb-7 text-white shadow-md rounded-2xl md:mt-3 border border-sky-950">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs md:text-sm font-bold bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-full transition-all active:scale-95 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.home}</span>
          </button>

          <h2 className="font-extrabold text-base md:text-xl tracking-tight text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#00BAF2]" />
            <span>{t.profile}</span>
          </h2>

          <div className="w-12" />
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3.5 mt-4 bg-white/10 p-3.5 sm:p-4 rounded-2xl border border-white/15 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-cyan-400 text-[#002970] font-black text-xl flex items-center justify-center shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-base text-white truncate">{user.name}</h3>
            <p className="text-xs text-cyan-200 flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3.5 h-3.5" />
              <span>+91 {user.phone}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (Desktop 6 cols): Language, PWA & Controls */}
        <div className="lg:col-span-6 space-y-3.5">
          {/* Language Selection Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-50 text-[#002970] flex items-center justify-center border border-sky-100">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-slate-900 block">
                  {t.appLanguage}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                  {t.languageStatus}
                </span>
              </div>
            </div>

            <button
              onClick={onToggleLang}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-extrabold text-xs text-slate-800 transition active:scale-95 border border-slate-200"
            >
              {t.switchLanguage}
            </button>
          </div>

          {/* PWA Info */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100">
                  <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">
                    {lang === 'hi' ? 'ऑफ़लाइन एवं ऐप इंस्टॉल' : 'Offline Ready & Install'}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                    {lang === 'hi' ? 'बिना इंटरनेट भी सुरक्षित डेटा' : 'Cached offline with service worker'}
                  </span>
                </div>
              </div>

              {isInstallable && (
                <button
                  onClick={install}
                  className="px-3 sm:px-3.5 py-1.5 bg-[#002970] hover:bg-sky-900 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition"
                >
                  {t.installApp}
                </button>
              )}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-2xl border border-rose-200 flex items-center justify-center gap-2 active:scale-98 transition shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout}</span>
          </button>
        </div>

        {/* Right Column (Desktop 6 cols): Manage Platforms */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/90">
            <div className="flex items-center justify-between mb-3.5">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
                {t.platformManager}
              </h4>
              <button
                onClick={onOpenAddPlatform}
                className="flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>{t.addPlatform}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {platforms.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: p.colorTheme }}
                    >
                      {p.icon || p.platformName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 block">
                        {p.platformName}
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {p.isActive ? (lang === 'hi' ? 'चालू है' : 'Active') : (lang === 'hi' ? 'छिपा हुआ' : 'Hidden')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTogglePlatformActive(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                      title={p.isActive ? 'Hide' : 'Show'}
                    >
                      {p.isActive ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    </button>

                    <button
                      onClick={() => handleDeletePlatform(p.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
