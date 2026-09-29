import React, { useState, useEffect } from 'react';
import {
  PlatformAccount,
  Transaction,
  DateRange,
  Language,
  TransactionType,
  PlatformSummary,
} from '../types';
import { getT } from '../i18n/translations';
import { ApiClient } from '../services/api';
import {
  ArrowLeft,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
} from 'lucide-react';

interface Props {
  platform: PlatformAccount;
  lang: Language;
  onBack: () => void;
  onOpenKeypad: (type: TransactionType) => void;
  onDataChanged?: () => void;
  onDeletePlatform?: (platformId: string) => void;
  refreshTrigger?: number;
}

export const PlatformDashboard: React.FC<Props> = ({
  platform,
  lang,
  onBack,
  onOpenKeypad,
  onDataChanged,
  onDeletePlatform,
  refreshTrigger,
}) => {
  const t = getT(lang);
  const [range, setRange] = useState<DateRange>('today');
  const [summary, setSummary] = useState<PlatformSummary>(
    platform.summary || {
      totalEarned: 0,
      totalWithdrawn: 0,
      incentivePending: 0,
      incentiveReceived: 0,
      netRemaining: 0,
    }
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async (newRange: DateRange) => {
    setLoading(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        ApiClient.getPlatformSummary(platform.id, newRange),
        ApiClient.getPlatformTransactions(platform.id, newRange),
      ]);

      if (sumRes?.summary) {
        setSummary(sumRes.summary);
      }
      if (txRes?.transactions) {
        setTransactions(txRes.transactions);
      }
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(range);
  }, [platform.id, range, refreshTrigger]);

  const handleToggleIncentive = async (txId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'received' ? 'pending' : 'received';
    // Optimistic toggle
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, incentiveStatus: nextStatus } : t))
    );
    try {
      await ApiClient.updateIncentiveStatus(txId, nextStatus);
      await fetchDashboardData(range);
      onDataChanged?.();
    } catch (e) {
      console.error(e);
      fetchDashboardData(range);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    // 1. Optimistic removal & real-time recalculation
    const targetTx = transactions.find((t) => t.id === txId);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));

    if (targetTx) {
      setSummary((prev) => {
        let newEarned = prev.totalEarned;
        let newWithdrawn = prev.totalWithdrawn;
        let newPending = prev.incentivePending;
        let newReceived = prev.incentiveReceived;

        if (targetTx.type === 'earning') {
          newEarned -= targetTx.amount;
        } else if (targetTx.type === 'withdrawal') {
          newWithdrawn -= targetTx.amount;
        } else if (targetTx.type === 'incentive') {
          if (targetTx.incentiveStatus === 'received') {
            newReceived -= targetTx.amount;
            newEarned -= targetTx.amount;
          } else {
            newPending -= targetTx.amount;
          }
        }
        const netRemaining = newEarned - newWithdrawn;
        return {
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
      await fetchDashboardData(range);
      onDataChanged?.();
    } catch (e) {
      console.error('Failed to delete transaction:', e);
      fetchDashboardData(range);
    }
  };

  const handleDeletePlatform = async () => {
    const confirmMsg =
      lang === 'hi'
        ? `क्या आप वाकई "${platform.platformName}" और इसके सभी लेन-देन को हटाना चाहते हैं?`
        : `Are you sure you want to remove "${platform.platformName}" and all associated transactions?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await ApiClient.deletePlatform(platform.id);
      onDeletePlatform?.(platform.id);
      onBack();
    } catch (e) {
      console.error('Failed to delete platform:', e);
    }
  };

  const themeColor = platform.colorTheme || '#002970';

  // Find latest pending incentive if any
  const pendingIncentiveTx = transactions.find(
    (tx) => tx.type === 'incentive' && tx.incentiveStatus === 'pending'
  );

  const [txFilter, setTxFilter] = useState<'all' | 'earning' | 'withdrawal' | 'incentive'>('all');

  const filteredTransactions = transactions.filter((t) => {
    if (txFilter === 'all') return true;
    return t.type === txFilter;
  });

  return (
    <div className="animate-fade-in pb-20 md:pb-10 max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-6">
      {/* Top Header */}
      <div
        className="px-4 md:px-6 pt-4 pb-6 md:pb-7 text-white shadow-md relative rounded-2xl md:mt-3 border border-white/10"
        style={{
          background: `linear-gradient(135deg, ${themeColor} 0%, #001740 100%)`,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs md:text-sm font-bold bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-full transition-all active:scale-95 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.home}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm border border-white/20"
              style={{ backgroundColor: themeColor }}
            >
              {platform.icon || platform.platformName.charAt(0)}
            </span>
            <span className="font-extrabold text-base md:text-xl tracking-tight text-white">
              {platform.platformName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 text-cyan-200 px-2.5 py-1 rounded-lg border border-white/20">
              {lang === 'hi' ? 'सक्रिय' : 'Live'}
            </span>
            <button
              type="button"
              onClick={handleDeletePlatform}
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 hover:text-white border border-rose-400/30 transition-all active:scale-95"
              title={lang === 'hi' ? 'प्लेटफ़ॉर्म हटाएं' : 'Remove Platform'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
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

      {/* Main Responsive Grid: 2 columns on desktop (lg+), single column on mobile */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (Desktop 5 cols): Balance, MINI Cards & Quick Action Buttons */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Big Balance Card (Remaining) */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/90 text-center">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              {t.remaining} ({range === 'today' ? t.today : range === 'week' ? t.week : range === 'month' ? t.month : t.all})
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-sky-800">₹</span>
              <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                {summary.netRemaining.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-1">
              {lang === 'hi' ? 'कमाई − निकासी = बाकी' : 'Earned − Withdrawn = In Hand'}
            </p>
          </div>

          {/* Three Responsive Stat MINI-Cards in a Row */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Total Earned MINI Card */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 text-center shadow-xs flex flex-col justify-between min-h-[85px]">
              <span className="text-[10px] font-bold text-emerald-800 block truncate">
                {t.totalEarned}
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-700 font-mono block mt-0.5 tabular-nums">
                ₹{summary.totalEarned.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-emerald-600 font-medium block">
                {lang === 'hi' ? 'कुल कमाई' : 'Gross'}
              </span>
            </div>

            {/* Total Withdrawn MINI Card */}
            <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3 text-center shadow-xs flex flex-col justify-between min-h-[85px]">
              <span className="text-[10px] font-bold text-rose-800 block truncate">
                {t.totalWithdrawn}
              </span>
              <span className="text-base sm:text-lg font-black text-rose-700 font-mono block mt-0.5 tabular-nums">
                ₹{summary.totalWithdrawn.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-rose-600 font-medium block">
                {lang === 'hi' ? 'निकासी' : 'Cashout'}
              </span>
            </div>

            {/* Incentive MINI Card */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-center shadow-xs flex flex-col justify-between min-h-[85px]">
              <span className="text-[10px] font-bold text-amber-800 block truncate">
                {t.incentive}
              </span>
              <span className="text-base sm:text-lg font-black text-amber-700 font-mono block mt-0.5 tabular-nums">
                ₹{summary.incentivePending.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-amber-600 font-medium block">
                {lang === 'hi' ? 'बोनस' : 'Bonus'}
              </span>
            </div>
          </div>

          {/* Action Buttons: + Add Earning, - Cashout, + Incentive */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onOpenKeypad('earning')}
              className="flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              <span>{t.addEarning}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenKeypad('withdrawal')}
              className="flex items-center justify-center gap-2 py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm shadow-sm transition-all"
            >
              <Minus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
              <span>{t.addWithdrawal}</span>
            </button>
          </div>

          {/* Incentive / Bonus Action Button */}
          <button
            type="button"
            onClick={() => onOpenKeypad('incentive')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-2xl font-bold text-xs transition active:scale-98"
          >
            <Gift className="w-4 h-4 text-amber-600" />
            <span>{lang === 'hi' ? '+ नया इंसेंटिव / बोनस जोड़ें' : '+ Add Target Incentive / Bonus'}</span>
          </button>

          {/* Weekly Incentive Card with 1-tap Received status */}
          {pendingIncentiveTx && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-amber-900 font-mono">
                      ₹{pendingIncentiveTx.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full">
                      {t.pending}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium truncate">
                    {pendingIncentiveTx.note || t.weeklyIncentive}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggleIncentive(pendingIncentiveTx.id, 'pending')}
                className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xs shrink-0 active:scale-95 transition"
              >
                {t.markReceived}
              </button>
            </div>
          )}
        </div>

        {/* Right Column (Desktop 7 cols): Transaction History Section */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200/90 h-full flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                <span>{t.transactions}</span>
                <span className="text-xs text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                  {filteredTransactions.length}
                </span>
              </h4>

              {/* Transaction Type Filter Controls */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {(['all', 'earning', 'withdrawal', 'incentive'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setTxFilter(filterType)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      txFilter === filterType
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filterType === 'all'
                      ? (lang === 'hi' ? 'सभी' : 'All')
                      : filterType === 'earning'
                      ? (lang === 'hi' ? 'कमाई' : 'Earn')
                      : filterType === 'withdrawal'
                      ? (lang === 'hi' ? 'निकासी' : 'Cashout')
                      : (lang === 'hi' ? 'बोनस' : 'Bonus')}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">
                {lang === 'hi' ? 'डेटा लोड हो रहा है...' : 'Loading transactions...'}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center my-auto">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">{t.noTransactions}</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  {lang === 'hi' ? 'इस फ़िल्टर में कोई लेन-देन नहीं मिला' : 'No entries recorded for this filter'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] pr-1">
                {filteredTransactions.map((tx) => {
                  const isEarn = tx.type === 'earning';
                  const isWithdraw = tx.type === 'withdrawal';
                  const isIncentive = tx.type === 'incentive';

                  const txDate = new Date(tx.date);
                  const timeStr = txDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const dateStr = txDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={tx.id}
                      className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/70 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon */}
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                            isEarn
                              ? 'bg-emerald-100 text-emerald-700'
                              : isWithdraw
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isEarn ? (
                            <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                          ) : isWithdraw ? (
                            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                          ) : (
                            <Gift className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                              {tx.tag || (isEarn ? t.earning : isWithdraw ? t.withdrawal : t.incentive)}
                            </span>
                            {isIncentive && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  tx.incentiveStatus === 'received'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {tx.incentiveStatus === 'received' ? t.received : t.pending}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-600 font-medium truncate">
                            {dateStr} • {timeStr} {tx.note ? `• ${tx.note}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`text-xs sm:text-sm font-black font-mono tabular-nums ${
                            isEarn
                              ? 'text-emerald-600'
                              : isWithdraw
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {isEarn ? '+' : isWithdraw ? '−' : '★'} ₹
                          {tx.amount.toLocaleString('en-IN')}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteTx(tx.id)}
                          title={lang === 'hi' ? 'लेन-देन हटाएं' : 'Delete transaction'}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition active:scale-95"
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
  );
};
