import React, { useState, useEffect } from 'react';
import { TransactionType, Language, PlatformAccount } from '../types';
import { getT } from '../i18n/translations';
import {
  X,
  Delete,
  Fuel,
  Package,
  Zap,
  Gift,
  Coffee,
  Wrench,
  Landmark,
  Check,
  Calendar,
  WifiOff,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  platforms: PlatformAccount[];
  selectedPlatformId: string;
  initialType?: TransactionType;
  lang: Language;
  onSave: (payload: {
    platformAccountId: string;
    type: TransactionType;
    amount: number;
    tag: string;
    note?: string;
    date?: string;
  }) => Promise<void>;
}

// Helper to format Date to YYYY-MM-DD in local time
function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TODAY_STR = getLocalDateString();
const YESTERDAY_STR = getLocalDateString(new Date(Date.now() - 86400000));

export const NumericKeypadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  platforms,
  selectedPlatformId,
  initialType = 'earning',
  lang,
  onSave,
}) => {
  const t = getT(lang);
  const [platformId, setPlatformId] = useState(selectedPlatformId);
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [note, setNote] = useState('');
  const [txDate, setTxDate] = useState<string>(TODAY_STR);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPlatformId(selectedPlatformId || (platforms[0]?.id ?? ''));
      setType(initialType);
      setAmountStr('');
      setSelectedTag(initialType === 'withdrawal' ? 'Fuel' : 'Order Payment');
      setNote('');
      setTxDate(getLocalDateString());
    }
  }, [isOpen, selectedPlatformId, initialType, platforms]);

  if (!isOpen) return null;

  const currentPlatform = platforms.find((p) => p.id === platformId) || platforms[0];

  const handleKeyPress = (val: string) => {
    if (val === 'backspace') {
      setAmountStr((prev) => prev.slice(0, -1));
    } else if (val === 'clear') {
      setAmountStr('');
    } else if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr((prev) => (prev ? prev + '.' : '0.'));
      }
    } else {
      // Limit to 7 digits
      if (amountStr.replace('.', '').length < 7) {
        setAmountStr((prev) => (prev === '0' ? val : prev + val));
      }
    }
  };

  const handleAddPreset = (addAmount: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(Math.round(current + addAmount)));
  };

  const currentAmount = parseFloat(amountStr) || 0;

  const handleSubmit = async () => {
    if (currentAmount <= 0 || !platformId) return;

    // Construct Date ISO string from chosen txDate, preserving current time of day if today
    let finalIsoDate: string;
    const now = new Date();
    if (txDate === TODAY_STR) {
      finalIsoDate = now.toISOString();
    } else {
      const [y, m, d] = txDate.split('-').map(Number);
      const chosenDate = new Date(y, m - 1, d, 12, 0, 0);
      finalIsoDate = chosenDate.toISOString();
    }

    setLoading(true);
    try {
      await onSave({
        platformAccountId: platformId,
        type,
        amount: currentAmount,
        date: finalIsoDate,
        tag: selectedTag,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Quick tags with icons
  const tagList =
    type === 'withdrawal'
      ? [
          { key: 'Fuel', label: t.fuel, icon: Fuel },
          { key: 'Cash Withdrawal', label: t.cashWithdrawal, icon: Landmark },
          { key: 'Food', label: t.food, icon: Coffee },
          { key: 'Maintenance', label: t.maintenance, icon: Wrench },
        ]
      : [
          { key: 'Order Payment', label: t.orderPay, icon: Package },
          { key: 'Surge', label: t.surge, icon: Zap },
          { key: 'Tips', label: t.tips, icon: Gift },
          { key: 'Incentive', label: t.incentive, icon: Gift },
        ];

  // Dynamic theme colors based on type
  const themeColors = {
    earning: {
      bg: 'bg-emerald-600 hover:bg-emerald-700',
      text: 'text-emerald-600',
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      border: 'border-emerald-500',
    },
    withdrawal: {
      bg: 'bg-rose-600 hover:bg-rose-700',
      text: 'text-rose-600',
      pill: 'bg-rose-50 text-rose-700 border-rose-300',
      border: 'border-rose-500',
    },
    incentive: {
      bg: 'bg-amber-600 hover:bg-amber-700',
      text: 'text-amber-600',
      pill: 'bg-amber-50 text-amber-800 border-amber-300',
      border: 'border-amber-500',
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs animate-fade-in p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[96vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          {/* Platform selector badge */}
          <div className="flex items-center gap-2">
            {platforms.length > 1 ? (
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002970]"
              >
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.platformName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: currentPlatform?.colorTheme }}
                />
                <span className="text-xs font-bold text-slate-800">
                  {currentPlatform?.platformName}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-4 space-y-3 shrink-1">
          {/* Type Toggle Chips (Earning / Withdrawal / Incentive) */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('earning');
                setSelectedTag('Order Payment');
              }}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all text-center ${
                type === 'earning'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.earning}
            </button>
            <button
              type="button"
              onClick={() => {
                setType('withdrawal');
                setSelectedTag('Fuel');
              }}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all text-center ${
                type === 'withdrawal'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.withdrawal}
            </button>
            <button
              type="button"
              onClick={() => {
                setType('incentive');
                setSelectedTag('Incentive');
              }}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all text-center ${
                type === 'incentive'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.incentive}
            </button>
          </div>

          {/* Date Selector: Native HTML5 Date Input + Quick Today/Yesterday Pills */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="tx-date-input" className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.dateLabel}</span>
              </label>
              {txDate !== TODAY_STR && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                  {lang === 'hi' ? 'पिछली तारीख' : 'Back-dated'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Native HTML5 Date Input */}
              <input
                id="tx-date-input"
                name="date"
                type="date"
                max={TODAY_STR}
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002970] cursor-pointer"
              />

              {/* Quick Today / Yesterday Shortcuts */}
              <button
                type="button"
                onClick={() => setTxDate(TODAY_STR)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                  txDate === TODAY_STR
                    ? 'bg-[#002970] text-white border-[#002970]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.todayDate}
              </button>
              <button
                type="button"
                onClick={() => setTxDate(YESTERDAY_STR)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                  txDate === YESTERDAY_STR
                    ? 'bg-[#002970] text-white border-[#002970]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.yesterdayDate}
              </button>
            </div>
          </div>

          {/* Hero Number Display */}
          <div className="bg-slate-50 border-2 border-slate-200/90 rounded-2xl p-3 text-center transition-all">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              {lang === 'hi' ? 'रकम डालें' : 'Enter Amount'}
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <span className={`text-2xl font-black ${themeColors.text}`}>₹</span>
              <span
                className={`text-4xl font-black font-mono tracking-tight ${
                  amountStr ? themeColors.text : 'text-slate-300'
                }`}
              >
                {amountStr || '0'}
              </span>
            </div>
          </div>

          {/* Quick Preset Chips (+₹50, +₹100, +₹200, +₹500) */}
          <div className="flex items-center justify-between gap-1.5">
            {[50, 100, 200, 500].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddPreset(preset)}
                className="flex-1 py-1.5 px-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg text-xs font-bold text-slate-700 transition font-mono border border-slate-200/60"
              >
                +{preset}
              </button>
            ))}
          </div>

          {/* Quick Tag Chips */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
              {t.quickTags}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {tagList.map((tag) => {
                const Icon = tag.icon;
                const isSelected = selectedTag === tag.key;
                return (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => setSelectedTag(tag.key)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? themeColors.pill
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Big Thumb-Friendly Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              '1', '2', '3',
              '4', '5', '6',
              '7', '8', '9',
              '.', '0', 'backspace'
            ].map((btn) => (
              <button
                key={btn}
                type="button"
                onClick={() => handleKeyPress(btn)}
                className={`h-12 rounded-xl text-lg font-bold flex items-center justify-center transition-all select-none active:scale-95 shadow-xs border ${
                  btn === 'backspace'
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 font-mono text-xl'
                }`}
              >
                {btn === 'backspace' ? (
                  <Delete className="w-5 h-5" />
                ) : (
                  btn
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Big Save Button Fixed at bottom */}
        <div className="p-3 border-t border-slate-100 bg-white shrink-0">
          {typeof navigator !== 'undefined' && !navigator.onLine && (
            <div className="flex items-center gap-1.5 justify-center mb-2 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.offlineQueuedNotice}</span>
            </div>
          )}

          <button
            type="button"
            disabled={loading || currentAmount <= 0}
            onClick={handleSubmit}
            className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${themeColors.bg}`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>
              {loading
                ? '...'
                : `${t.save} (₹${currentAmount.toLocaleString('en-IN')})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
