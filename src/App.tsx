/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  PlatformAccount,
  Language,
  DateRange,
  TransactionType,
  OverallSummary,
  Transaction,
} from './types';
import { getT } from './i18n/translations';
import { ApiClient } from './services/api';
import { syncService } from './services/backgroundSync';
import { Navbar } from './components/Navbar';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineBadge } from './components/OfflineBadge';
import { CombinedSummaryStrip } from './components/CombinedSummaryStrip';
import { PlatformCard } from './components/PlatformCard';
import { PlatformDashboard } from './components/PlatformDashboard';
import { OverallSummaryView } from './components/OverallSummaryView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { NumericKeypadModal } from './components/NumericKeypadModal';
import { AddPlatformModal } from './components/AddPlatformModal';
import { AuthModal } from './components/AuthModal';
import { PDFStatementModal } from './components/PDFStatementModal';
import {
  Home,
  PlusCircle,
  PieChart,
  User as UserIcon,
  Plus,
  Minus,
  RefreshCw,
  Layers,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  FileText,
} from 'lucide-react';

function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TODAY_STR = getLocalDateString();
const YESTERDAY_STR = getLocalDateString(new Date(Date.now() - 86400000));

type ActiveView = 'home' | 'platform' | 'summary' | 'profile';

export default function App() {
  const [user, setUser] = useState<User | null>(ApiClient.getUser());
  const [lang, setLang] = useState<Language>(
    (ApiClient.getUser()?.language as Language) || 'hi'
  );
  const [currentView, setCurrentView] = useState<ActiveView>('home');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformAccount | null>(null);
  const [range, setRange] = useState<string>(TODAY_STR);
  const [platforms, setPlatforms] = useState<PlatformAccount[]>([]);
  const [overallSummary, setOverallSummary] = useState<OverallSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [keypadInitialType, setKeypadInitialType] = useState<TransactionType>('earning');
  const [keypadPlatformId, setKeypadPlatformId] = useState<string>('');
  const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfPeriodType, setPdfPeriodType] = useState<'day' | 'week' | 'month' | 'all'>('day');

  const t = getT(lang);

  // Toggle language between Hindi & English
  const handleToggleLang = () => {
    const nextLang: Language = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    if (user) {
      ApiClient.updateProfile({ language: nextLang }).catch(console.error);
    }
  };

  // Date selection helpers for particular date
  const handleSelectHomeDate = (selectedDateStr: string) => {
    setRange(selectedDateStr);
    loadAppData(selectedDateStr);
  };

  const handleStepHomeDay = (delta: number) => {
    const cur = new Date(range);
    cur.setDate(cur.getDate() + delta);
    const nextDate = getLocalDateString(cur);
    setRange(nextDate);
    loadAppData(nextDate);
  };

  // Fetch platforms, overall summary & recent cross-platform transactions
  const loadAppData = useCallback(async (currentRange: DateRange) => {
    if (!ApiClient.getToken()) return;

    setLoading(true);
    try {
      const [platRes, sumRes, txRes] = await Promise.all([
        ApiClient.getPlatforms(currentRange),
        ApiClient.getOverallSummary(currentRange),
        ApiClient.getAllTransactions(currentRange),
      ]);

      if (platRes?.platforms) {
        setPlatforms(platRes.platforms);
        setSelectedPlatform((prev) => {
          if (!prev) return null;
          return platRes.platforms.find((p) => p.id === prev.id) || null;
        });
      }
      if (sumRes?.data) {
        setOverallSummary(sumRes.data);
      }
      if (txRes?.transactions) {
        setRecentTransactions(txRes.transactions);
      }
    } catch (e) {
      console.warn('App data fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initialize background sync service worker
    syncService.init(() => {
      loadAppData(range);
    });

    // Check authentic JWT token on app startup
    const token = ApiClient.getToken();
    if (token) {
      ApiClient.getMe()
        .then((res) => {
          if (res?.success && res.user) {
            setUser(res.user);
            setLang((res.user.language as Language) || 'hi');
            loadAppData(range);
          } else {
            ApiClient.clearAuth();
            setUser(null);
          }
        })
        .catch(() => {
          const cachedUser = ApiClient.getUser();
          if (cachedUser) {
            setUser(cachedUser);
            setLang((cachedUser.language as Language) || 'hi');
            loadAppData(range);
          } else {
            ApiClient.clearAuth();
            setUser(null);
          }
        });
    } else {
      setUser(null);
    }
  }, [loadAppData, range]);

  const handleAuthSuccess = (authedUser: User) => {
    setUser(authedUser);
    setLang((authedUser.language as Language) || 'hi');
    setCurrentView('home');
    loadAppData(range);
  };

  const handleLogout = () => {
    ApiClient.clearAuth();
    setUser(null);
    setPlatforms([]);
    setOverallSummary(null);
    setRecentTransactions([]);
  };

  const handleOpenPlatform = (platform: PlatformAccount) => {
    setSelectedPlatform(platform);
    setCurrentView('platform');
  };

  const handleOpenKeypad = (type: TransactionType = 'earning', platformId?: string) => {
    setKeypadInitialType(type);
    setKeypadPlatformId(platformId || selectedPlatform?.id || platforms[0]?.id || '');
    setIsKeypadOpen(true);
  };

  const handleSaveTransaction = async (payload: {
    platformAccountId: string;
    type: TransactionType;
    amount: number;
    tag: string;
    note?: string;
    date?: string;
  }) => {
    try {
      await ApiClient.createTransaction(payload);
      setRefreshTrigger((v) => v + 1);
      await loadAppData(range);
    } catch (e) {
      console.error('Failed to create transaction:', e);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    // 1. Instant optimistic removal from recent transactions
    const target = recentTransactions.find((t) => t.id === txId);
    setRecentTransactions((prev) => prev.filter((t) => t.id !== txId));

    // 2. Instant optimistic recalculation of overallSummary
    if (target && overallSummary) {
      setOverallSummary((prev) => {
        if (!prev) return prev;
        let newEarned = prev.totalEarned;
        let newWithdrawn = prev.totalWithdrawn;
        let newPending = prev.incentivePending;
        let newReceived = prev.incentiveReceived;

        if (target.type === 'earning') {
          newEarned -= target.amount;
        } else if (target.type === 'withdrawal') {
          newWithdrawn -= target.amount;
        } else if (target.type === 'incentive') {
          if (target.incentiveStatus === 'received') {
            newReceived -= target.amount;
            newEarned -= target.amount;
          } else {
            newPending -= target.amount;
          }
        }
        const netRemaining = newEarned - newWithdrawn;
        return {
          ...prev,
          totalEarned: Math.max(0, newEarned),
          totalWithdrawn: Math.max(0, newWithdrawn),
          incentivePending: Math.max(0, newPending),
          incentiveReceived: Math.max(0, newReceived),
          netRemaining,
          netBalance: netRemaining,
        };
      });
    }

    try {
      await ApiClient.deleteTransaction(txId);
      setRefreshTrigger((v) => v + 1);
      await loadAppData(range);
    } catch (e) {
      console.error('Failed to delete transaction:', e);
      loadAppData(range);
    }
  };

  const handleDeletePlatform = async (platformId: string) => {
    setPlatforms((prev) => prev.filter((p) => p.id !== platformId));
    setRecentTransactions((prev) => prev.filter((t) => t.platformAccountId !== platformId));
    if (selectedPlatform?.id === platformId) {
      setSelectedPlatform(null);
      setCurrentView('home');
    }
    setRefreshTrigger((v) => v + 1);
    await loadAppData(range);
  };

  const handleAddPlatform = async (name: string, color: string, icon: string) => {
    await ApiClient.addPlatform({ platformName: name, colorTheme: color, icon });
    setRefreshTrigger((v) => v + 1);
    loadAppData(range);
  };

  // Enforce authentic user login: No guest or demo bypass
  if (!user || !ApiClient.getToken()) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3 sm:p-4">
        <AuthModal
          lang={lang}
          onToggleLang={handleToggleLang}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  const activePlatforms = platforms.filter((p) => p.isActive);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-cyan-200">
      {/* Top Navbar spans full width on desktop */}
      <Navbar
        user={user}
        lang={lang}
        currentView={currentView}
        onNavigate={(view) => {
          setSelectedPlatform(null);
          setCurrentView(view);
        }}
        onOpenAddModal={() => handleOpenKeypad('earning')}
        onToggleLang={handleToggleLang}
        onOpenProfile={() => setCurrentView('profile')}
      />

      {/* Main Responsive Container: desktop wide layout max-w-7xl, tablet/mobile fluid app format */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col px-0 sm:px-4 md:px-6 lg:px-8 py-0 sm:py-5">
        <div className="w-full bg-slate-50 sm:rounded-3xl min-h-[calc(100vh-4.5rem)] sm:shadow-md sm:border sm:border-slate-200/90 relative flex flex-col justify-between overflow-hidden">
          <div>
            {/* PWA Install Banner */}
            <PWAInstallBanner lang={lang} />

            {/* Offline Status Badge */}
            <OfflineBadge lang={lang} />

            {/* View Router */}
            {currentView === 'home' && (
              <main className="pb-20 md:pb-10 animate-fade-in w-full">
                {/* Particular Date Selector Bar on Home Page */}
                <div className="px-3 sm:px-6 pt-3 sm:pt-4">
                  <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                    {/* Date Indicator and Stepper */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#002970] flex items-center justify-center border border-sky-100 shadow-xs">
                        <Calendar className="w-4 h-4 text-[#002970]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                            {range === TODAY_STR
                              ? (lang === 'hi' ? 'आज का हिसाब' : "Today's Summary")
                              : range === YESTERDAY_STR
                              ? (lang === 'hi' ? 'कल का हिसाब' : "Yesterday's Summary")
                              : (lang === 'hi' ? 'तारीख का हिसाब' : 'Date Summary')}
                          </span>
                          <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                            {new Date(range).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {lang === 'hi'
                            ? 'इस तारीख की कुल कमाई, हाथ में बैलेंस, निकासी और इंसेंटिव'
                            : 'Gross earnings, in-hand balance, payouts & incentives for this date'}
                        </p>
                      </div>
                    </div>

                    {/* Date Navigation & Picker Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSelectHomeDate(TODAY_STR)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                          range === TODAY_STR
                            ? 'bg-[#002970] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {lang === 'hi' ? 'आज' : 'Today'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectHomeDate(YESTERDAY_STR)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                          range === YESTERDAY_STR
                            ? 'bg-[#002970] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {lang === 'hi' ? 'कल' : 'Yesterday'}
                      </button>

                      {/* Date Stepper and Picker */}
                      <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleStepHomeDay(-1)}
                          className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
                          title="Previous Day"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <label
                          className="flex items-center gap-1 px-2 py-1 cursor-pointer text-xs font-mono font-bold text-slate-800 hover:bg-white rounded-lg transition"
                          title={lang === 'hi' ? 'तारीख चुनें' : 'Choose specific date'}
                        >
                          <CalendarDays className="w-3.5 h-3.5 text-sky-700" />
                          <span>{range}</span>
                          <input
                            type="date"
                            value={range}
                            onChange={(e) => e.target.value && handleSelectHomeDate(e.target.value)}
                            className="sr-only"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleStepHomeDay(1)}
                          className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition"
                          title="Next Day"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Export Billing PDF Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPdfPeriodType('day');
                          setIsPdfModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-2xs transition active:scale-95"
                        title={lang === 'hi' ? 'दैनिक, साप्ताहिक या मासिक बिलिंग PDF एक्सपोर्ट करें' : 'Export Day, Week or Monthly Billing PDF'}
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-600" />
                        <span>{lang === 'hi' ? 'बिलिंग PDF' : 'Billing PDF'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Combined summary strip at top with 4 MINI cards */}
                <CombinedSummaryStrip
                  lang={lang}
                  totalEarned={overallSummary?.totalEarned || 0}
                  totalWithdrawn={overallSummary?.totalWithdrawn || 0}
                  netRemaining={overallSummary?.netRemaining || 0}
                  incentivePending={overallSummary?.incentivePending || 0}
                  incentiveReceived={overallSummary?.incentiveReceived || 0}
                />

                {/* Desktop Action Bar (Clean single-language actions, no date toggle buttons on home) */}
                <div className="hidden sm:flex px-3 sm:px-6 pt-3 sm:pt-4 items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                      <span>{t.activePlatformsCount}:</span>{' '}
                      <strong className="text-slate-900 font-bold">{activePlatforms.length}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenKeypad('earning')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{t.addEarning}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenKeypad('withdrawal')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{t.addWithdrawal}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddPlatformOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-extrabold transition active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{t.addPlatform}</span>
                    </button>
                  </div>
                </div>

                {/* Main Content Layout: 12-column grid on desktop, single column on mobile */}
                <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
                    {/* Left Area (Desktop 8 cols): Platforms & Delivery Accounts */}
                    <div className="lg:col-span-8">
                      {activePlatforms.length === 0 ? (
                        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm text-center flex flex-col items-center justify-center my-2">
                          <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#002970] flex items-center justify-center mb-4 border border-sky-100 shadow-xs">
                            <Layers className="w-8 h-8" />
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            {lang === 'hi' ? 'अभी कोई प्लेटफ़ॉर्म नहीं जुड़ा है' : 'No Platforms Added Yet'}
                          </h3>
                          <p className="text-xs text-slate-500 max-w-sm mt-1.5 mb-6 font-medium leading-relaxed">
                            {lang === 'hi'
                              ? 'दैनिक कमाई और निकासी ट्रैक करने के लिए अपने डिलीवरी प्लेटफ़ॉर्म (Zomato, Swiggy, Blinkit या कस्टम) जोड़ें।'
                              : 'Add the delivery platforms you work for (Zomato, Swiggy, Blinkit, or custom) to start tracking your daily earnings and payouts.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddPlatformOpen(true)}
                            className="px-6 py-3 rounded-xl bg-[#002970] hover:bg-[#001e54] text-white text-xs sm:text-sm font-extrabold shadow-md active:scale-98 transition flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>{t.addPlatform}</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                            <div className="flex items-center gap-2">
                              <h2 className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                {t.platformsLabel}
                              </h2>
                              <span className="text-[10px] sm:text-[11px] font-bold text-sky-800 bg-sky-100 px-2 py-0.2 rounded-full">
                                {activePlatforms.length}
                              </span>
                            </div>

                            <button
                              onClick={() => loadAppData(range)}
                              className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs transition"
                              title="Refresh"
                            >
                              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${loading ? 'animate-spin' : ''}`} />
                              <span className="hidden sm:inline">{lang === 'hi' ? 'ताज़ा करें' : 'Refresh'}</span>
                            </button>
                          </div>

                          {/* Responsive Grid: 2 columns on mobile, 3 on tablet/desktop */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3.5">
                            {activePlatforms.map((plt) => (
                              <PlatformCard
                                key={plt.id}
                                platform={plt}
                                lang={lang}
                                onClick={() => handleOpenPlatform(plt)}
                              />
                            ))}

                            {/* + Add Platform MINI Card */}
                            <button
                              type="button"
                              onClick={() => setIsAddPlatformOpen(true)}
                              className="flex flex-col items-center justify-center p-2.5 sm:p-4 bg-white/60 hover:bg-white rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-300 hover:border-sky-500 transition-all text-slate-600 hover:text-sky-800 active:scale-98 group min-h-[110px] sm:min-h-[135px] shadow-xs"
                            >
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center mb-1.5 sm:mb-2 text-slate-400 group-hover:text-sky-700 transition-colors shadow-xs">
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                              </div>
                              <span className="font-extrabold text-[11px] sm:text-sm text-center leading-tight">
                                {t.addPlatform}
                              </span>
                              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium text-center mt-0.5">
                                {lang === 'hi' ? 'नया खाता जोड़ें' : 'Add account'}
                              </span>
                            </button>
                          </div>

                          {/* Mobile Only: Recent Activity for selected date */}
                          <div className="block lg:hidden mt-4">
                            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                                  {t.recentActivity} ({range === TODAY_STR ? (lang === 'hi' ? 'आज' : 'Today') : range})
                                </h3>
                                <button
                                  onClick={() => handleOpenKeypad('earning')}
                                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                                >
                                  + {lang === 'hi' ? 'नया जोड़ें' : 'Quick Add'}
                                </button>
                              </div>

                              {recentTransactions.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-500 font-medium">
                                  {lang === 'hi' ? 'इस तारीख पर कोई लेनदेन दर्ज नहीं है।' : 'No transactions recorded for this date.'}
                                </div>
                              ) : (
                                <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto pr-1">
                                  {recentTransactions.slice(0, 5).map((tx) => {
                                    const isEarn = tx.type === 'earning';
                                    const isWithdraw = tx.type === 'withdrawal';
                                    const plt = platforms.find((p) => p.id === tx.platformAccountId);

                                    return (
                                      <div key={tx.id} className="py-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div
                                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-xs"
                                            style={{ backgroundColor: plt?.colorTheme || '#002970' }}
                                          >
                                            {plt?.icon || plt?.platformName.charAt(0) || '•'}
                                          </div>
                                          <div className="min-w-0">
                                            <span className="font-bold text-xs text-slate-900 block truncate">
                                              {plt?.platformName || 'Platform'} • {tx.tag || (isEarn ? t.earning : isWithdraw ? t.withdrawal : t.incentive)}
                                            </span>
                                            <span className="text-[10px] text-slate-500 block">
                                              {new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span
                                            className={`text-xs font-mono font-black shrink-0 ${
                                              isEarn ? 'text-emerald-600' : isWithdraw ? 'text-rose-600' : 'text-amber-600'
                                            }`}
                                          >
                                            {isEarn ? '+' : isWithdraw ? '−' : '★'} ₹{tx.amount.toLocaleString('en-IN')}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteTransaction(tx.id)}
                                            title={lang === 'hi' ? 'हटाएं' : 'Delete transaction'}
                                            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition active:scale-95"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Area (Desktop 4 cols): Companion Pulse & Live Feed Widget (hidden on mobile, visible on lg+) */}
                    <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
                      {/* Platform Share Breakdown Card (No analytics button on home) */}
                      <div className="bg-white rounded-3xl p-4.5 border border-slate-200/90 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                            {lang === 'hi' ? 'प्लेटफ़ॉर्म शेयर अनुपात' : 'Platform Distribution'}
                          </h3>
                        </div>

                        {/* Visual share bar */}
                        {overallSummary && overallSummary.totalEarned > 0 ? (
                          <div>
                            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 mb-3 shadow-inner">
                              {overallSummary.platformBreakdown.map((item) => {
                                if (item.percentage <= 0) return null;
                                return (
                                  <div
                                    key={item.platformId}
                                    style={{
                                      width: `${item.percentage}%`,
                                      backgroundColor: item.colorTheme,
                                    }}
                                    title={`${item.platformName}: ${item.percentage}%`}
                                    className="h-full transition-all hover:brightness-110"
                                  />
                                );
                              })}
                            </div>

                            <div className="space-y-2">
                              {overallSummary.platformBreakdown.slice(0, 4).map((item) => (
                                <div key={item.platformId} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: item.colorTheme }}
                                    />
                                    <span className="font-bold text-slate-800 truncate">{item.platformName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-900">
                                      ₹{item.totalEarned.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                      {item.percentage}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-xs text-slate-600 font-medium">
                            {lang === 'hi' ? 'अभी तक कोई कमाई दर्ज नहीं हुई' : 'No platform earnings recorded yet'}
                          </div>
                        )}
                      </div>

                      {/* Cross-Platform Recent Activity Feed */}
                      <div className="bg-white rounded-3xl p-4.5 border border-slate-200/90 shadow-xs flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                              {t.recentActivity} ({range === TODAY_STR ? (lang === 'hi' ? 'आज' : 'Today') : range})
                            </h3>
                            <button
                              onClick={() => handleOpenKeypad('earning')}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                            >
                              + {lang === 'hi' ? 'नया जोड़ें' : 'Quick Add'}
                            </button>
                          </div>

                          {recentTransactions.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-600 font-medium">
                              {lang === 'hi' ? 'इस तारीख पर कोई लेनदेन दर्ज नहीं है।' : 'No transactions recorded for this date.'}
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto pr-1">
                              {recentTransactions.slice(0, 5).map((tx) => {
                                const isEarn = tx.type === 'earning';
                                const isWithdraw = tx.type === 'withdrawal';
                                const plt = platforms.find((p) => p.id === tx.platformAccountId);

                                return (
                                  <div key={tx.id} className="py-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-xs"
                                        style={{ backgroundColor: plt?.colorTheme || '#002970' }}
                                      >
                                        {plt?.icon || plt?.platformName.charAt(0) || '•'}
                                      </div>
                                      <div className="min-w-0">
                                        <span className="font-bold text-xs text-slate-900 block truncate">
                                          {plt?.platformName || 'Platform'} • {tx.tag || (isEarn ? t.earning : isWithdraw ? t.withdrawal : t.incentive)}
                                        </span>
                                        <span className="text-[10px] text-slate-600 block">
                                          {new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className={`text-xs font-mono font-black shrink-0 ${
                                          isEarn ? 'text-emerald-600' : isWithdraw ? 'text-rose-600' : 'text-amber-600'
                                        }`}
                                      >
                                        {isEarn ? '+' : isWithdraw ? '−' : '★'} ₹{tx.amount.toLocaleString('en-IN')}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTransaction(tx.id)}
                                        title={lang === 'hi' ? 'हटाएं' : 'Delete transaction'}
                                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition active:scale-95"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            )}

            {currentView === 'platform' && selectedPlatform && (
              <PlatformDashboard
                platform={selectedPlatform}
                lang={lang}
                onBack={() => setCurrentView('home')}
                onOpenKeypad={(type) => handleOpenKeypad(type, selectedPlatform.id)}
                onDataChanged={() => {
                  loadAppData(range);
                  setRefreshTrigger((v) => v + 1);
                }}
                onDeletePlatform={handleDeletePlatform}
                refreshTrigger={refreshTrigger}
              />
            )}

            {currentView === 'summary' && (
              <OverallSummaryView
                lang={lang}
                onBack={() => setCurrentView('home')}
                onDataChanged={() => {
                  loadAppData(range);
                  setRefreshTrigger((v) => v + 1);
                }}
              />
            )}

            {currentView === 'profile' && user && (
              <ProfileSettingsView
                user={user}
                platforms={platforms}
                lang={lang}
                onBack={() => setCurrentView('home')}
                onLogout={handleLogout}
                onToggleLang={handleToggleLang}
                onRefreshData={() => {
                  loadAppData(range);
                  setRefreshTrigger((v) => v + 1);
                }}
                onOpenAddPlatform={() => setIsAddPlatformOpen(true)}
              />
            )}
          </div>

          {/* Bottom Tab Bar (Appears on mobile, compact sleek styling with small icons) */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-3 flex items-center justify-around z-30 shadow-md">
            {/* Home Tab */}
            <button
              onClick={() => setCurrentView('home')}
              className={`flex flex-col items-center justify-center flex-1 py-0.5 text-[10px] font-bold transition-all ${
                currentView === 'home' ? 'text-[#002970]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Home className="w-4 h-4 mb-0.5" />
              <span>{t.home}</span>
            </button>

            {/* Quick Keypad Center Action Button */}
            <div className="relative -top-3.5 flex-1 flex justify-center">
              <button
                onClick={() => handleOpenKeypad('earning')}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#002970] to-[#00BAF2] text-white flex flex-col items-center justify-center shadow-md active:scale-95 transition-transform border-2 border-white"
                title="Add Amount"
              >
                <span className="text-base font-bold font-mono leading-none">₹</span>
                <span className="text-[8px] font-extrabold uppercase mt-0.5">
                  {lang === 'hi' ? 'जोड़ें' : 'Add'}
                </span>
              </button>
            </div>

            {/* Overall Summary Tab */}
            <button
              onClick={() => setCurrentView('summary')}
              className={`flex flex-col items-center justify-center flex-1 py-0.5 text-[10px] font-bold transition-all ${
                currentView === 'summary' ? 'text-[#002970]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <PieChart className="w-4 h-4 mb-0.5" />
              <span>{t.summary}</span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => setCurrentView('profile')}
              className={`flex flex-col items-center justify-center flex-1 py-0.5 text-[10px] font-bold transition-all ${
                currentView === 'profile' ? 'text-[#002970]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <UserIcon className="w-4 h-4 mb-0.5" />
              <span>{t.profile}</span>
            </button>
          </nav>

          {/* Numeric Keypad Popup Modal */}
          <NumericKeypadModal
            isOpen={isKeypadOpen}
            onClose={() => setIsKeypadOpen(false)}
            platforms={activePlatforms}
            selectedPlatformId={keypadPlatformId}
            initialType={keypadInitialType}
            initialDate={range}
            lang={lang}
            onSave={handleSaveTransaction}
          />

          {/* Add Platform Modal (Predefined Top + Custom) */}
          <AddPlatformModal
            lang={lang}
            isOpen={isAddPlatformOpen}
            existingPlatforms={platforms}
            onClose={() => setIsAddPlatformOpen(false)}
            onAdd={handleAddPlatform}
          />

          {/* Professional Billing PDF Statement Modal */}
          {overallSummary && (
            <PDFStatementModal
              isOpen={isPdfModalOpen}
              onClose={() => setIsPdfModalOpen(false)}
              user={
                user || {
                  id: 'usr_rider',
                  name: 'Verified Partner',
                  phone: 'Partner Mobile',
                  language: lang,
                }
              }
              lang={lang}
              periodType={pdfPeriodType}
              periodLabel={
                range === TODAY_STR
                  ? `${range} (${lang === 'hi' ? 'आज' : 'Today'})`
                  : range === YESTERDAY_STR
                  ? `${range} (${lang === 'hi' ? 'कल' : 'Yesterday'})`
                  : range
              }
              summary={overallSummary}
              platforms={platforms}
            />
          )}
        </div>
      </div>
    </div>
  );
}
