import React, { useState, useEffect } from 'react';
import { OverallSummary, DateRange, Language } from '../types';
import { getT } from '../i18n/translations';
import { ApiClient } from '../services/api';
import {
  ArrowLeft,
  Share2,
  PieChart,
  Wallet,
  TrendingUp,
  TrendingDown,
  Gift,
  Check,
} from 'lucide-react';

interface Props {
  lang: Language;
  onBack: () => void;
}

export const OverallSummaryView: React.FC<Props> = ({ lang, onBack }) => {
  const t = getT(lang);
  const [range, setRange] = useState<DateRange>('month');
  const [summary, setSummary] = useState<OverallSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOverall = async (selectedRange: DateRange) => {
    setLoading(true);
    try {
      const res = await ApiClient.getOverallSummary(selectedRange);
      if (res?.data) {
        setSummary(res.data);
      }
    } catch (e) {
      console.warn('Overall fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverall(range);
  }, [range]);

  const handleShare = () => {
    if (!summary) return;
    const rangeName =
      range === 'today' ? t.today : range === 'week' ? t.week : range === 'month' ? t.month : t.all;

    const reportText = `🛵 *RiderWallet Report (${rangeName})*
💰 Total Earned: ₹${summary.totalEarned.toLocaleString('en-IN')}
🔻 Total Withdrawn: ₹${summary.totalWithdrawn.toLocaleString('en-IN')}
⭐ Total Incentive: ₹${summary.incentivePending.toLocaleString('en-IN')}
💵 Net Remaining: ₹${summary.netRemaining.toLocaleString('en-IN')}

${summary.platformBreakdown
  .map((p) => `• ${p.platformName}: ₹${p.totalEarned.toLocaleString('en-IN')} (${p.percentage}%)`)
  .join('\n')}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rangeLabel =
    range === 'today' ? t.today : range === 'week' ? t.week : range === 'month' ? t.month : t.all;

  return (
    <div className="animate-fade-in pb-20 md:pb-10 max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-6">
      {/* Top Header */}
      <div className="bg-[#002970] px-4 md:px-6 pt-4 pb-6 md:pb-7 text-white shadow-md rounded-2xl md:mt-3 border border-sky-950">
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

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs md:text-sm font-bold bg-[#00BAF2] hover:bg-sky-400 text-[#002970] px-3.5 py-1.5 rounded-full shadow-xs active:scale-95 transition"
            title="Share"
          >
            {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? (lang === 'hi' ? 'कॉपी हुआ' : 'Copied!') : (lang === 'hi' ? 'शेयर' : 'Share')}</span>
          </button>
        </div>

        {/* Date Filter Segmented Controls */}
        <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-xl w-full max-w-lg mx-auto justify-between">
          {(['today', 'week', 'month', 'all'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all text-center ${
                range === r
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {r === 'today'
                ? t.today
                : r === 'week'
                ? t.week
                : r === 'month'
                ? t.month
                : t.all}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout: 2-column on desktop, single column on mobile */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (Desktop 6 cols): 4 MINI Cards + Financial Health Insight */}
        <div className="lg:col-span-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* MINI Card 1: Total Earned */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 block leading-tight">
                  {t.totalEarned}
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 mt-1">
                  <span className="text-xs sm:text-sm font-bold text-emerald-600">₹</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                    {(summary?.totalEarned || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 font-medium block mt-0.5">
                  {lang === 'hi' ? 'सभी प्लेटफ़ॉर्म की कुल आय' : 'Gross Income'}
                </span>
              </div>
            </div>

            {/* MINI Card 2: Total Withdrawn */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 block leading-tight">
                  {t.totalWithdrawn}
                </span>
                <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 mt-1">
                  <span className="text-xs sm:text-sm font-bold text-rose-600">₹</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                    {(summary?.totalWithdrawn || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 font-medium block mt-0.5">
                  {t.payouts}
                </span>
              </div>
            </div>

            {/* MINI Card 3: Total Incentive */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 block leading-tight">
                  {t.incentive}
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Gift className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 mt-1">
                  <span className="text-xs sm:text-sm font-bold text-amber-600">₹</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                    {(summary?.incentivePending || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 font-medium block mt-0.5">
                  {lang === 'hi' ? 'बकाया टारगेट बोनस' : 'Pending Incentives'}
                </span>
              </div>
            </div>

            {/* MINI Card 4: Net Remaining */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50/70 rounded-2xl p-3.5 sm:p-4 shadow-xs border border-sky-200/90 flex flex-col justify-between min-h-[105px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-sky-950 block leading-tight">
                  {t.netRemaining}
                </span>
                <div className="w-7 h-7 rounded-xl bg-[#002970] text-white flex items-center justify-center shadow-xs">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-0.5 mt-1">
                  <span className="text-xs sm:text-sm font-bold text-sky-800">₹</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#002970] font-mono tracking-tight tabular-nums">
                    {(summary?.netRemaining || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-sky-800 font-bold block mt-0.5">
                  {lang === 'hi' ? 'हाथ में शेष राशि' : 'Available Balance'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Balance Health Insight */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">
                {lang === 'hi' ? 'वित्तीय स्थिति सूत्र' : 'Financial Calculation Logic'}
              </h4>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                {lang === 'hi'
                  ? 'कमाई − निकासी = वर्तमान शेष बैलेंस'
                  : 'Net Remaining = Total Gross Earnings − Total Withdrawn'}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-right">
              <span className="text-[10px] text-sky-700 font-bold block">
                {lang === 'hi' ? 'बैलेंस अनुपात' : 'Balance Ratio'}
              </span>
              <span className="font-mono font-black text-sm text-[#002970]">
                {summary && summary.totalEarned > 0
                  ? `${Math.round((summary.netRemaining / summary.totalEarned) * 100)}%`
                  : '100%'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Desktop 6 cols): Platform Breakdown Meter and Card List */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/90">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                <span>{t.splitByPlatform}</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                ₹{(summary?.totalEarned || 0).toLocaleString('en-IN')} {lang === 'hi' ? 'कुल' : 'Total'}
              </span>
            </div>

            {/* Stacked Proportional Color Bar */}
            {summary && summary.totalEarned > 0 ? (
              <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-100 mb-4 shadow-inner">
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
              <div className="w-full h-3 rounded-full bg-slate-100 mb-4" />
            )}

            {/* List of platforms with amounts and percentages */}
            <div className="space-y-2.5">
              {summary?.platformBreakdown.map((item) => (
                <div
                  key={item.platformId}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: item.colorTheme }}
                    >
                      {item.icon || item.platformName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 block truncate">
                        {item.platformName}
                      </span>
                      <span className="text-[10px] text-slate-600 font-medium">
                        {lang === 'hi' ? 'बैलेंस:' : 'Bal:'} ₹{item.netRemaining.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 font-mono block text-xs sm:text-sm">
                      ₹{item.totalEarned.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 inline-block">
                      {item.percentage}%
                    </span>
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
