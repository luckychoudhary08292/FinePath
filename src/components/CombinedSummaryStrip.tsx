import React from 'react';
import { Language } from '../types';
import { getT } from '../i18n/translations';
import { TrendingUp, Wallet, ArrowDownRight, Gift } from 'lucide-react';

interface Props {
  lang: Language;
  totalEarned: number;
  totalWithdrawn: number;
  netRemaining: number;
  incentivePending?: number;
}

export const CombinedSummaryStrip: React.FC<Props> = ({
  lang,
  totalEarned,
  totalWithdrawn,
  netRemaining,
  incentivePending = 0,
}) => {
  const t = getT(lang);

  return (
    <section className="px-3 sm:px-6 pt-2.5 sm:pt-4 w-full">
      {/* 4 Professional Responsive MINI Cards: 2-col on mobile with small size & icons, 4-col on tablet/desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
        {/* MINI Card 1: Total Earned */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[76px] sm:min-h-[96px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 block truncate">
              {t.totalEarned}
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-600">₹</span>
              <span className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                {totalEarned.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-600 font-medium truncate mt-0.5">
              {t.grossIncome}
            </p>
          </div>
        </div>

        {/* MINI Card 2: In Hand Balance */}
        <div className="bg-gradient-to-br from-sky-50/80 to-blue-50/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-sky-200/90 shadow-xs flex flex-col justify-between min-h-[76px] sm:min-h-[96px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-sky-950 block truncate">
              {t.inHandBalance}
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-[#002970] text-cyan-200 flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[11px] sm:text-xs font-bold text-sky-800">₹</span>
              <span className="text-lg sm:text-2xl font-black text-[#002970] font-mono tracking-tight tabular-nums">
                {netRemaining.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-sky-800 font-medium truncate mt-0.5">
              {t.earnedMinusWithdrawn}
            </p>
          </div>
        </div>

        {/* MINI Card 3: Total Withdrawn */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[76px] sm:min-h-[96px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 block truncate">
              {t.totalWithdrawn}
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[11px] sm:text-xs font-bold text-rose-600">₹</span>
              <span className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                {totalWithdrawn.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-600 font-medium truncate mt-0.5">
              {t.payouts}
            </p>
          </div>
        </div>

        {/* MINI Card 4: Pending / Earned Incentive */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[76px] sm:min-h-[96px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 block truncate">
              {t.incentive}
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Gift className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[11px] sm:text-xs font-bold text-amber-600">₹</span>
              <span className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                {incentivePending.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-600 font-medium truncate mt-0.5">
              {t.bonusIncentives}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


