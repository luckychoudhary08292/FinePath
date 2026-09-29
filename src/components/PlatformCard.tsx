import React from 'react';
import { PlatformAccount, Language } from '../types';
import { getT } from '../i18n/translations';
import { ChevronRight, Gift, ArrowDownRight } from 'lucide-react';

interface Props {
  platform: PlatformAccount;
  lang: Language;
  onClick: () => void;
}

export const PlatformCard: React.FC<Props> = ({ platform, lang, onClick }) => {
  const t = getT(lang);
  const earned = platform.summary?.totalEarned ?? 0;
  const withdrawn = platform.summary?.totalWithdrawn ?? 0;
  const remaining = platform.summary?.netRemaining ?? 0;
  const pendingIncentive = platform.summary?.incentivePending ?? 0;

  const themeColor = platform.colorTheme || '#002970';

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col justify-between p-2.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all text-left active:scale-[0.98] group overflow-hidden w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      {/* Top platform color indicator accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 opacity-90 transition-all group-hover:h-2"
        style={{ backgroundColor: themeColor }}
      />

      {/* Header zone with brand logo and chevron */}
      <div className="flex items-center justify-between w-full mb-2 mt-0.5">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-base text-white shadow-xs shrink-0 transition-transform group-hover:scale-105"
            style={{ backgroundColor: themeColor }}
          >
            {platform.icon || platform.platformName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-[11px] sm:text-sm text-slate-900 truncate leading-tight group-hover:text-sky-900 transition-colors">
              {platform.platformName}
            </h3>
            <span className="text-[9px] sm:text-[10px] text-slate-600 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{t.activeAccount}</span>
            </span>
          </div>
        </div>

        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-slate-100/80 flex items-center justify-center text-slate-600 group-hover:text-slate-900 group-hover:bg-slate-200/80 transition-colors shrink-0">
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Primary Financial Metric (Earned) */}
      <div className="w-full">
        <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
          {t.totalEarned}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-[11px] sm:text-xs font-bold text-emerald-600">₹</span>
          <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
            {earned.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Bottom stats row: Balance & Withdrawn/Incentive badges */}
        <div className="mt-2 pt-1.5 sm:mt-2.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
          <div className="truncate">
            <span className="text-[9px] sm:text-[10px] text-slate-600 font-medium block leading-none">
              {t.balance}:
            </span>
            <span className="font-extrabold text-sky-800 font-mono tabular-nums text-[11px] sm:text-xs">
              ₹{remaining.toLocaleString('en-IN')}
            </span>
          </div>

          {pendingIncentive > 0 ? (
            <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-extrabold text-amber-800 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg border border-amber-200/80 shrink-0">
              <Gift className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600" />
              <span>+₹{pendingIncentive}</span>
            </span>
          ) : withdrawn > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-md sm:rounded-lg border border-slate-200/80 shrink-0">
              <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500" />
              <span>₹{withdrawn.toLocaleString('en-IN')}</span>
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
};

