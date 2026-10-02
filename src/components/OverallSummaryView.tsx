import React, { useState, useEffect, useCallback } from 'react';
import { OverallSummary, DateRange, Language, Transaction, User } from '../types';
import { getT } from '../i18n/translations';
import { ApiClient } from '../services/api';
import { PDFStatementModal } from './PDFStatementModal';
import {
  ArrowLeft,
  Share2,
  PieChart,
  Wallet,
  TrendingUp,
  TrendingDown,
  Gift,
  Check,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CalendarDays,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Sparkles,
  Infinity as InfinityIcon,
  Fuel,
  Coffee,
  Wrench,
  Landmark,
  Receipt,
  RotateCcw,
  FileText,
  Download,
} from 'lucide-react';

interface Props {
  lang: Language;
  onBack: () => void;
  onDataChanged?: () => void;
}

function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get Monday of the universal calendar week (Monday to Sunday)
function getMonday(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getExpenseIcon(tag: string) {
  const lower = tag.toLowerCase();
  if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('पेट्रोल')) return Fuel;
  if (lower.includes('food') || lower.includes('tea') || lower.includes('chai') || lower.includes('खाना')) return Coffee;
  if (lower.includes('service') || lower.includes('repair') || lower.includes('maintenance') || lower.includes('सर्विस')) return Wrench;
  if (lower.includes('cash') || lower.includes('bank') || lower.includes('transfer') || lower.includes('निकासी')) return Landmark;
  return Receipt;
}

const HINDI_DAYS: Record<string, string> = {
  Mon: 'सोम',
  Tue: 'मंगल',
  Wed: 'बुध',
  Thu: 'गुरु',
  Fri: 'शुक्र',
  Sat: 'शनि',
  Sun: 'रवि',
};

export const OverallSummaryView: React.FC<Props> = ({ lang, onBack, onDataChanged }) => {
  const t = getT(lang);

  // Active Tab: 'today' | 'week' | 'month' | 'all'
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Specific day state for 'today' tab
  const [particularDate, setParticularDate] = useState<string>(getLocalDateString());

  // Specific week state for 'week' tab (always starting on Monday)
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<string>(() =>
    getLocalDateString(getMonday())
  );

  // Specific month state for 'month' tab (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [summary, setSummary] = useState<OverallSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Determine query range strictly according to active tab
  let queryRange: string;
  if (activeTab === 'today') {
    queryRange = particularDate;
  } else if (activeTab === 'week') {
    queryRange = `week:${selectedWeekMonday}`;
  } else if (activeTab === 'month') {
    queryRange = `month:${selectedMonth}`;
  } else {
    queryRange = 'all';
  }

  const fetchOverall = useCallback(async (rangeKey: string) => {
    setLoading(true);
    try {
      const res = await ApiClient.getOverallSummary(rangeKey as DateRange);
      if (res?.data) {
        setSummary(res.data);
      }
    } catch (e) {
      console.warn('Overall fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverall(queryRange);
  }, [fetchOverall, queryRange]);

  // Stepping through days in 'today' tab
  const handleStepDay = (delta: number) => {
    const cur = new Date(particularDate);
    cur.setDate(cur.getDate() + delta);
    setParticularDate(getLocalDateString(cur));
  };

  // Stepping through weeks in 'week' tab
  const handleStepWeek = (deltaWeeks: number) => {
    const [y, m, d] = selectedWeekMonday.split('-').map(Number);
    const cur = new Date(y, m - 1, d);
    cur.setDate(cur.getDate() + deltaWeeks * 7);
    setSelectedWeekMonday(getLocalDateString(cur));
  };

  // Stepping through months in 'month' tab
  const handleStepMonth = (deltaMonths: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m - 1 + deltaMonths, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextYear}-${nextMonth}`);
  };

  const handleDeleteTx = async (txId: string) => {
    try {
      await ApiClient.deleteTransaction(txId);
      await fetchOverall(queryRange);
      onDataChanged?.();
    } catch (e) {
      console.error('Failed to delete transaction:', e);
    }
  };

  const handleShare = () => {
    if (!summary) return;
    const tabName =
      activeTab === 'today'
        ? `${t.today} (${particularDate})`
        : activeTab === 'week'
        ? `${t.week} (${selectedWeekMonday})`
        : activeTab === 'month'
        ? `${t.month} (${selectedMonth})`
        : t.all;

    const reportText = `🛵 *RiderWallet Report (${tabName})*
💰 Total Earned: ₹${summary.totalEarned.toLocaleString('en-IN')}
🔻 Total Withdrawn / Expenses: ₹${summary.totalWithdrawn.toLocaleString('en-IN')}
⭐ Total Incentive: ₹${((summary.incentivePending || 0) + (summary.incentiveReceived || 0)).toLocaleString('en-IN')}
💵 In Hand Balance: ₹${summary.netRemaining.toLocaleString('en-IN')}

${summary.platformBreakdown
  .map((p) => `• ${p.platformName}: ₹${p.totalEarned.toLocaleString('en-IN')} (${p.percentage}%)`)
  .join('\n')}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Date labels
  const isToday = particularDate === getLocalDateString();
  const isYesterday = particularDate === getLocalDateString(new Date(Date.now() - 86400000));
  const dateFormatted = new Date(particularDate).toLocaleDateString(
    lang === 'hi' ? 'hi-IN' : 'en-IN',
    { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
  );

  // Week range labels (Monday to Sunday)
  const weekStartObj = new Date(selectedWeekMonday);
  const weekEndObj = new Date(weekStartObj);
  weekEndObj.setDate(weekEndObj.getDate() + 6);
  const weekRangeLabel = `${weekStartObj.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
  })} – ${weekEndObj.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
  const isCurrentWeek = selectedWeekMonday === getLocalDateString(getMonday());

  // Month label
  const [mYear, mMonth] = selectedMonth.split('-').map(Number);
  const monthLabel = new Date(mYear, mMonth - 1, 1).toLocaleDateString(
    lang === 'hi' ? 'hi-IN' : 'en-IN',
    { month: 'long', year: 'numeric' }
  );
  const nowMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedMonth === nowMonthStr;

  const totalIncentive = (summary?.incentivePending || 0) + (summary?.incentiveReceived || 0);

  return (
    <div className="animate-fade-in pb-24 md:pb-12 max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-6">
      {/* Top Header */}
      <div className="bg-[#002970] px-4 md:px-6 pt-4 pb-5 md:pb-6 text-white shadow-md rounded-2xl md:mt-3 border border-sky-950">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs md:text-sm font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition-all active:scale-95 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.home}</span>
          </button>

          <h2 className="font-black text-base md:text-xl tracking-tight text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#00BAF2]" />
            <span>{t.summary}</span>
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1.5 text-xs md:text-sm font-bold bg-white text-[#002970] hover:bg-slate-100 px-3.5 py-1.5 rounded-full shadow-xs active:scale-95 transition"
              title={lang === 'hi' ? 'व्यावसायिक बिलिंग PDF एक्सपोर्ट करें' : 'Export Professional Billing PDF'}
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>{lang === 'hi' ? 'PDF एक्सपोर्ट' : 'Export PDF'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs md:text-sm font-bold bg-[#00BAF2] hover:bg-sky-400 text-[#002970] px-3.5 py-1.5 rounded-full shadow-xs active:scale-95 transition"
              title="Share"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? (lang === 'hi' ? 'कॉपी हुआ' : 'Copied!') : (lang === 'hi' ? 'शेयर' : 'Share')}</span>
            </button>
          </div>
        </div>

        {/* 4 Standard Scope Tabs: today, week, month, all */}
        <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-xl w-full max-w-xl mx-auto justify-between">
          {[
            { id: 'today', label: t.today, icon: Calendar },
            { id: 'week', label: t.week, icon: CalendarDays },
            { id: 'month', label: t.month, icon: BarChart3 },
            { id: 'all', label: t.all, icon: InfinityIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: Sub-bar for 'today' tab: Particular Single Day Selector */}
        {activeTab === 'today' && (
          <div className="mt-3.5 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 max-w-xl mx-auto">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setParticularDate(getLocalDateString())}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                  isToday ? 'bg-[#00BAF2] text-[#002970] shadow-xs' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {lang === 'hi' ? 'आज' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => setParticularDate(getLocalDateString(new Date(Date.now() - 86400000)))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                  isYesterday ? 'bg-[#00BAF2] text-[#002970] shadow-xs' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {lang === 'hi' ? 'कल' : 'Yesterday'}
              </button>
            </div>

            {/* Stepper + Date input */}
            <div className="flex items-center gap-1 bg-white/15 rounded-lg px-2 py-0.5 border border-white/20">
              <button
                type="button"
                onClick={() => handleStepDay(-1)}
                className="p-1 hover:bg-white/20 rounded text-white active:scale-95"
                title={lang === 'hi' ? 'पिछला दिन' : 'Previous Day'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono font-bold text-white px-1.5 hover:text-cyan-200">
                <Calendar className="w-3.5 h-3.5 text-cyan-200" />
                <span>{particularDate}</span>
                <input
                  type="date"
                  value={particularDate}
                  onChange={(e) => e.target.value && setParticularDate(e.target.value)}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => handleStepDay(1)}
                className="p-1 hover:bg-white/20 rounded text-white active:scale-95"
                title={lang === 'hi' ? 'अगला दिन' : 'Next Day'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Sub-bar for 'week' tab: Universal Calendar Week Navigator (Mon–Sun) */}
        {activeTab === 'week' && (
          <div className="mt-3.5 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => setSelectedWeekMonday(getLocalDateString(getMonday()))}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                isCurrentWeek ? 'bg-[#00BAF2] text-[#002970] shadow-xs' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {lang === 'hi' ? 'चालू हफ़्ता' : 'Current Week'}
            </button>

            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2 py-0.5 border border-white/20">
              <button
                type="button"
                onClick={() => handleStepWeek(-1)}
                className="p-1 hover:bg-white/20 rounded text-white active:scale-95"
                title={lang === 'hi' ? 'पिछला हफ़्ता' : 'Previous Week'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-cyan-200 px-2 font-mono">
                {weekRangeLabel}
              </span>

              <button
                type="button"
                onClick={() => handleStepWeek(1)}
                className="p-1 hover:bg-white/20 rounded text-white active:scale-95"
                title={lang === 'hi' ? 'अगला हफ़्ता' : 'Next Week'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Sub-bar for 'month' tab: Calendar Month Navigator */}
        {activeTab === 'month' && (
          <div className="mt-3.5 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => setSelectedMonth(nowMonthStr)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                isCurrentMonth ? 'bg-[#00BAF2] text-[#002970] shadow-xs' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {lang === 'hi' ? 'चालू महीना' : 'Current Month'}
            </button>

            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2 py-0.5 border border-white/20">
              <button
                type="button"
                onClick={() => handleStepMonth(-1)}
                className="p-1 hover:bg-white/20 rounded text-white active:scale-95"
                title={lang === 'hi' ? 'पिछला महीना' : 'Previous Month'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-extrabold text-cyan-200 px-2">
                {monthLabel}
              </span>

              <button
                type="button"
                onClick={() => handleStepMonth(1)}
                className="p-1 hover:bg-white/20 rounded text-white active:scale-95"
                title={lang === 'hi' ? 'अगला महीना' : 'Next Month'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Sub-bar for 'all' tab: All-time Notice */}
        {activeTab === 'all' && (
          <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between text-xs max-w-xl mx-auto">
            <span className="text-cyan-200 font-bold flex items-center gap-1.5">
              <InfinityIcon className="w-4 h-4" />
              <span>{lang === 'hi' ? 'बिना किसी तारीख या माह की पाबंदी के पूरा संयुक्त डेटा' : 'All-time financial aggregate across all delivery records'}</span>
            </span>
            <span className="bg-white/15 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">
              {lang === 'hi' ? 'असीमित' : 'Lifetime'}
            </span>
          </div>
        )}
      </div>

      {/* Scope Context Banner */}
      <div className="mt-3 px-3.5 py-2.5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {activeTab === 'today'
              ? `${lang === 'hi' ? 'तारीख का हिसाब' : 'Date Summary'}: ${isToday ? (lang === 'hi' ? 'आज' : 'Today') : isYesterday ? (lang === 'hi' ? 'कल' : 'Yesterday') : ''} (${dateFormatted})`
              : activeTab === 'week'
              ? `${lang === 'hi' ? 'साप्ताहिक कैलेंडर हिसाब' : 'Weekly Calendar Summary'}: ${weekRangeLabel} (${lang === 'hi' ? 'सोमवार से रविवार' : 'Monday to Sunday'})`
              : activeTab === 'month'
              ? `${lang === 'hi' ? 'महीने का संयुक्त हिसाब' : 'Combined Monthly Summary'}: ${monthLabel} (${lang === 'hi' ? '1 से अंतिम तारीख' : '1st to End of Month'})`
              : `${lang === 'hi' ? 'ऑल-टाइम संयुक्त हिसाब (बिना किसी तारीख सीमा के)' : 'All-Time Combined Financials (No Restrictions)'}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-extrabold text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1 rounded-md shadow-xs transition active:scale-95"
            title={lang === 'hi' ? 'इस अवधि का बिलिंग PDF डाउनलोड करें' : 'Download Billing PDF for this period'}
          >
            <Download className="w-3 h-3 stroke-[2.5]" />
            <span>PDF</span>
          </button>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 bg-sky-50 text-[#002970] rounded-md border border-sky-100 font-mono">
            {activeTab}
          </span>
        </div>
      </div>

      {/* Main Content Layout: 2-column on desktop, single column on mobile */}
      <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (Desktop 6 cols): 4 MINI Cards + Scope Specific Insights */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* MINI Card 1: Total Earned */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 block leading-tight">
                  {t.totalEarned}
                </span>
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-emerald-600">₹</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                    {(summary?.totalEarned || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {activeTab === 'today'
                    ? (lang === 'hi' ? 'उस दिन की कुल आय' : 'Day Gross Earnings')
                    : activeTab === 'week'
                    ? (lang === 'hi' ? 'हफ़्ते की कुल आय' : 'Week Gross Earnings')
                    : activeTab === 'month'
                    ? (lang === 'hi' ? 'महीने की कुल आय' : 'Month Gross Earnings')
                    : (lang === 'hi' ? 'ऑल-टाइम कुल आय' : 'Lifetime Gross Earnings')}
                </span>
              </div>
            </div>

            {/* MINI Card 2: In Hand Balance */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50/70 rounded-2xl p-3.5 sm:p-4 shadow-xs border border-sky-200/90 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] sm:text-xs font-bold text-sky-950 block leading-tight">
                  {t.inHandBalance}
                </span>
                <div className="w-6 h-6 rounded-lg bg-[#002970] text-cyan-200 flex items-center justify-center shadow-xs">
                  <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-sky-800">₹</span>
                  <span className="text-xl sm:text-2xl font-black text-[#002970] font-mono tracking-tight tabular-nums">
                    {(summary?.netRemaining || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-sky-800 font-bold block mt-0.5">
                  {lang === 'hi' ? 'कमाई − निकासी (हाथ में बाकी)' : 'Gross − Withdrawn / Expenses'}
                </span>
              </div>
            </div>

            {/* MINI Card 3: Total Withdrawn / Expenses */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 block leading-tight">
                  {t.totalWithdrawn}
                </span>
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-rose-600">₹</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                    {(summary?.totalWithdrawn || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  {lang === 'hi' ? 'निकासी व खर्चे' : 'Payouts & Expenses'}
                </span>
              </div>
            </div>

            {/* MINI Card 4: Total Incentive */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 block leading-tight">
                  {t.incentive}
                </span>
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Gift className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-xs sm:text-sm font-bold text-amber-600">₹</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                    {totalIncentive.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate">
                  {(summary?.incentiveReceived || 0) > 0
                    ? (lang === 'hi' ? `₹${summary?.incentiveReceived} मिला • ₹${summary?.incentivePending} बाकी` : `₹${summary?.incentiveReceived} rec • ₹${summary?.incentivePending} pend`)
                    : (lang === 'hi' ? `₹${summary?.incentivePending || 0} बाकी इंसेंटिव` : `₹${summary?.incentivePending || 0} pending incentive`)}
                </span>
              </div>
            </div>
          </div>

          {/* TAB SPECIFIC WIDGETS */}

          {/* 1. TODAY TAB: Expenses Breakdown Widget for that Particular Day */}
          {activeTab === 'today' && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  <span>{lang === 'hi' ? 'उस दिन का कुल खर्च विवरण' : 'Day Expenses & Withdrawals Breakdown'}</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {particularDate}
                </span>
              </div>

              {!summary?.expenseBreakdown || summary.expenseBreakdown.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-500 font-medium">
                  {lang === 'hi'
                    ? 'इस दिन कोई खर्च या निकासी दर्ज नहीं है।'
                    : 'No expenses or payouts recorded on this date.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {summary.expenseBreakdown.map((exp, idx) => {
                    const ExpIcon = getExpenseIcon(exp.tag);
                    const percent =
                      summary.totalWithdrawn > 0
                        ? Math.round((exp.totalAmount / summary.totalWithdrawn) * 100)
                        : 0;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
                            <ExpIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{exp.tag}</span>
                            <span className="text-[10px] text-slate-500">
                              {exp.count} {lang === 'hi' ? 'बार' : 'entries'} • {percent}% of day expenses
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="font-black text-rose-600 text-xs block">
                            -₹{exp.totalAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. WEEK TAB: Universal Calendar 7-Day Chart (Monday through Sunday) */}
          {activeTab === 'week' && summary?.dailyBreakdown && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-sky-600" />
                  <span>
                    {lang === 'hi'
                      ? 'साप्ताहिक कैलेंडर 7-दिन चार्ट (सोमवार से रविवार)'
                      : 'Universal Calendar Week Chart (Mon – Sun)'}
                  </span>
                </h3>
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 font-mono">
                  {weekRangeLabel}
                </span>
              </div>

              {/* Day-by-day 7 column bar graph */}
              <div className="grid grid-cols-7 gap-1 pt-2 pb-1 border-b border-slate-100 mb-3 text-center">
                {summary.dailyBreakdown.map((day) => {
                  const maxVal = Math.max(
                    ...summary.dailyBreakdown!.map((d) => Math.max(d.totalEarned, d.totalWithdrawn, 100))
                  );
                  const earnHeight = Math.min(100, Math.round((day.totalEarned / maxVal) * 75));
                  const withdrawHeight = Math.min(100, Math.round((day.totalWithdrawn / maxVal) * 75));
                  const isDayToday = day.date === getLocalDateString();

                  return (
                    <div
                      key={day.date}
                      className={`flex flex-col items-center justify-end h-32 p-1 rounded-xl transition ${
                        isDayToday ? 'bg-sky-50/70 border border-sky-200/80' : ''
                      }`}
                    >
                      {/* Bars container */}
                      <div className="flex items-end gap-1 h-20 w-full justify-center">
                        <div
                          style={{ height: `${Math.max(4, earnHeight)}%` }}
                          title={`Earned: ₹${day.totalEarned}`}
                          className="w-2 sm:w-2.5 bg-emerald-500 rounded-t-sm transition-all"
                        />
                        <div
                          style={{ height: `${Math.max(4, withdrawHeight)}%` }}
                          title={`Withdrawn: ₹${day.totalWithdrawn}`}
                          className="w-2 sm:w-2.5 bg-rose-400 rounded-t-sm transition-all"
                        />
                      </div>
                      <span className={`text-[10px] font-extrabold mt-1 block ${isDayToday ? 'text-sky-900 underline' : 'text-slate-800'}`}>
                        {lang === 'hi' ? HINDI_DAYS[day.dayName] || day.dayName : day.dayName}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 block truncate">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend & 7-Day Table */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 mb-2.5 px-1 font-semibold">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
                    {lang === 'hi' ? 'कमाई' : 'Earned'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-rose-400 rounded-xs" />
                    {lang === 'hi' ? 'निकासी' : 'Withdrawn'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {summary.dailyBreakdown.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-9 text-center font-bold text-slate-700 bg-white border border-slate-200 rounded py-0.5 text-[10px]">
                        {lang === 'hi' ? HINDI_DAYS[day.dayName] || day.dayName : day.dayName}
                      </span>
                      <span className="text-slate-600 text-[11px] font-mono">{day.date}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-emerald-700 font-bold text-[11px]">
                        +₹{day.totalEarned.toLocaleString('en-IN')}
                      </span>
                      <span className="text-rose-600 font-bold text-[11px]">
                        -₹{day.totalWithdrawn.toLocaleString('en-IN')}
                      </span>
                      <span className="font-black text-slate-900 text-xs min-w-[55px] text-right">
                        ₹{day.netRemaining.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. MONTH TAB: Week-by-Week Calendar Breakdown for that Particular Month */}
          {activeTab === 'month' && summary?.weeklyBreakdown && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'hi' ? 'महीने का सप्ताह-वार संयुक्त विभाजन' : 'Monthly Combined Weekly Breakdown'}</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {monthLabel}
                </span>
              </div>

              <div className="space-y-2">
                {summary.weeklyBreakdown.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 block">
                        {w.weekLabel}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {w.startDate.slice(5)} → {w.endDate.slice(5)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-emerald-700 font-bold text-xs">
                          +₹{w.totalEarned.toLocaleString('en-IN')}
                        </span>
                        <span className="text-rose-600 font-bold text-xs">
                          -₹{w.totalWithdrawn.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className="font-black text-slate-900 font-mono text-xs block mt-0.5">
                        {lang === 'hi' ? 'हाथ में बाकी:' : 'Net In Hand:'} ₹{w.netRemaining.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ALL TIME TAB: Monthly History Breakdown */}
          {activeTab === 'all' && summary?.weeklyBreakdown && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <InfinityIcon className="w-4 h-4 text-indigo-600" />
                  <span>{lang === 'hi' ? 'माह-वार ऑल-टाइम इतिहास' : 'Monthly All-Time History'}</span>
                </h3>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {lang === 'hi' ? 'असीमित' : 'Unlimited'}
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {summary.weeklyBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    {lang === 'hi' ? 'अभी तक कोई पिछला इतिहास नहीं मिला' : 'No recorded monthly history yet'}
                  </p>
                ) : (
                  summary.weeklyBreakdown.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block">
                          {m.weekLabel}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {lang === 'hi' ? 'कुल अर्जित आय' : 'Total Gross Earnings'}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-black text-slate-900 text-sm block">
                          ₹{m.totalEarned.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          {lang === 'hi' ? 'निकासी:' : 'Out:'} ₹{m.totalWithdrawn.toLocaleString('en-IN')} • {lang === 'hi' ? 'नेट:' : 'Net:'} ₹{m.netRemaining.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Financial Calculation Formula Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">
                {lang === 'hi' ? 'वित्तीय हिसाब सूत्र' : 'Financial Calculation Formula'}
              </h4>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                {lang === 'hi'
                  ? 'कुल कमाई − कुल निकासी व खर्चे = हाथ में बाकी बैलेंस'
                  : 'In Hand Balance = Total Gross Earnings − Total Withdrawn / Expenses'}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-right">
              <span className="text-[10px] text-sky-700 font-bold block">
                {lang === 'hi' ? 'बैलेंस अनुपात' : 'Balance Ratio'}
              </span>
              <span className="font-mono font-black text-sm text-[#002970]">
                {summary && summary.totalEarned > 0
                  ? `${Math.max(0, Math.round((summary.netRemaining / summary.totalEarned) * 100))}%`
                  : '100%'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Desktop 6 cols): Platform Breakdown + Transactions Log for that range */}
        <div className="lg:col-span-6 space-y-3.5">
          {/* Platform Share Meter & List */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/90">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <span>{t.splitByPlatform}</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                ₹{(summary?.totalEarned || 0).toLocaleString('en-IN')} {lang === 'hi' ? 'कुल' : 'Total'}
              </span>
            </div>

            {/* Stacked Proportional Color Bar */}
            {summary && summary.totalEarned > 0 ? (
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 mb-3.5 shadow-inner">
                {summary.platformBreakdown.map((item) => {
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
            ) : (
              <div className="w-full h-3 rounded-full bg-slate-100 mb-3.5" />
            )}

            {/* List of platforms with amounts and percentages */}
            <div className="space-y-2">
              {summary?.platformBreakdown.map((item) => (
                <div
                  key={item.platformId}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: item.colorTheme }}
                    >
                      {item.icon || item.platformName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-900 block truncate">
                        {item.platformName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {lang === 'hi' ? 'हाथ में बाकी:' : 'Bal:'} ₹{item.netRemaining.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 font-mono block text-xs">
                      ₹{item.totalEarned.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100 inline-block font-mono">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions / Expenses Log for Selected Scope */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/90">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <span>{t.transactions}</span>
                <span className="text-xs text-slate-400 font-semibold font-mono">
                  ({summary?.transactions?.length || 0})
                </span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                {activeTab === 'today'
                  ? `${particularDate}`
                  : activeTab === 'week'
                  ? `${weekRangeLabel}`
                  : activeTab === 'month'
                  ? `${monthLabel}`
                  : (lang === 'hi' ? 'ऑल-टाइम' : 'All-time')}
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold">
                {lang === 'hi' ? 'डेटा लोड हो रहा है...' : 'Loading entries...'}
              </div>
            ) : !summary?.transactions || summary.transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                {activeTab === 'today'
                  ? (lang === 'hi' ? 'इस तारीख पर कोई लेनदेन दर्ज नहीं है।' : 'No transactions recorded on this date.')
                  : activeTab === 'week'
                  ? (lang === 'hi' ? 'इस हफ़्ते कोई लेनदेन दर्ज नहीं है।' : 'No transactions recorded for this week.')
                  : activeTab === 'month'
                  ? (lang === 'hi' ? 'इस महीने कोई लेनदेन दर्ज नहीं है।' : 'No transactions recorded for this month.')
                  : (lang === 'hi' ? 'अभी कोई लेनदेन दर्ज नहीं है।' : 'No transactions recorded.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                {summary.transactions.map((tx: any) => {
                  const isEarn = tx.type === 'earning';
                  const isWithdraw = tx.type === 'withdrawal';
                  const plt = summary.platformBreakdown.find((p) => p.platformId === tx.platformAccountId);

                  return (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                            isEarn
                              ? 'bg-emerald-100 text-emerald-700'
                              : isWithdraw
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isEarn ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : isWithdraw ? (
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <Gift className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900 block truncate">
                            {plt?.platformName || 'Platform'} • {tx.tag || (isEarn ? t.earning : isWithdraw ? t.withdrawal : t.incentive)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {tx.note ? `• ${tx.note}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono font-black ${
                            isEarn ? 'text-emerald-600' : isWithdraw ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        >
                          {isEarn ? '+' : isWithdraw ? '−' : '★'} ₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTx(tx.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition active:scale-95"
                          title={lang === 'hi' ? 'हटाएं' : 'Delete'}
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

      {/* Professional Billing PDF Statement Modal */}
      {summary && (
        <PDFStatementModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          user={
            ApiClient.getUser() || {
              id: 'usr_rider',
              name: 'Verified Partner',
              phone: 'Partner Mobile',
              language: lang,
            }
          }
          lang={lang}
          periodType={activeTab === 'today' ? 'day' : activeTab}
          periodLabel={
            activeTab === 'today'
              ? `${particularDate} (${isToday ? (lang === 'hi' ? 'आज' : 'Today') : isYesterday ? (lang === 'hi' ? 'कल' : 'Yesterday') : dateFormatted})`
              : activeTab === 'week'
              ? `${weekRangeLabel} (Mon–Sun)`
              : activeTab === 'month'
              ? `${monthLabel}`
              : (lang === 'hi' ? 'ऑल-टाइम संयुक्त रिकॉर्ड' : 'All-Time Lifetime Record')
          }
          summary={summary}
        />
      )}
    </div>
  );
};
