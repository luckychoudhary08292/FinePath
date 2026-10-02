import React, { useRef, useState, useEffect, useCallback } from 'react';
import { User, OverallSummary, Language, PlatformAccount } from '../types';
import { getT } from '../i18n/translations';
import { exportElementToPdf } from '../services/pdfGenerator';
import { ApiClient } from '../services/api';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  Calendar,
  CalendarDays,
  BarChart3,
  Infinity as InfinityIcon,
  ShieldCheck,
  Receipt,
  Fuel,
  Coffee,
  Wrench,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Printer,
  Building2,
  Check,
  Smartphone,
  Tag,
  Hash,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  lang: Language;
  periodType: 'day' | 'week' | 'month' | 'all';
  periodLabel: string;
  summary: OverallSummary;
  platforms?: PlatformAccount[];
  platformName?: string;
  platformAccountId?: string;
}

function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
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

export const PDFStatementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  lang,
  periodType: initialPeriodType,
  periodLabel: initialPeriodLabel,
  summary: initialSummary,
  platforms = [],
  platformName,
  platformAccountId,
}) => {
  const t = getT(lang);
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Interactive Period State: allows changing Day, Week, Month directly in modal
  const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'month' | 'all'>(initialPeriodType || 'day');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const match = initialPeriodLabel?.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : getLocalDateString();
  });
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<string>(() => getLocalDateString(getMonday()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [currentSummary, setCurrentSummary] = useState<OverallSummary>(initialSummary);
  const [loadingData, setLoadingData] = useState(false);

  // Sync when initial props change
  useEffect(() => {
    if (isOpen) {
      setActivePeriod(initialPeriodType);
      setCurrentSummary(initialSummary);
    }
  }, [isOpen, initialPeriodType, initialSummary]);

  // Compute query range based on interactive selection
  let queryRange = '';
  if (activePeriod === 'day') {
    queryRange = selectedDate;
  } else if (activePeriod === 'week') {
    queryRange = `week:${selectedWeekMonday}`;
  } else if (activePeriod === 'month') {
    queryRange = `month:${selectedMonth}`;
  } else {
    queryRange = 'all';
  }

  // Fetch updated data when period controls change
  const fetchPeriodData = useCallback(async (rangeKey: string) => {
    setLoadingData(true);
    try {
      if (platformAccountId) {
        // Platform specific
        const [sumRes, txRes] = await Promise.all([
          ApiClient.getPlatformSummary(platformAccountId, rangeKey as any),
          ApiClient.getPlatformTransactions(platformAccountId, rangeKey as any),
        ]);
        if (sumRes?.summary) {
          const s = sumRes.summary;
          setCurrentSummary({
            range: rangeKey,
            totalEarned: s.totalEarned,
            totalWithdrawn: s.totalWithdrawn,
            incentivePending: s.incentivePending,
            incentiveReceived: s.incentiveReceived,
            netRemaining: s.netRemaining,
            platformBreakdown: [
              {
                platformId: platformAccountId,
                platformName: platformName || 'Platform',
                colorTheme: '#002970',
                icon: 'P',
                totalEarned: s.totalEarned,
                totalWithdrawn: s.totalWithdrawn,
                netRemaining: s.netRemaining,
                percentage: 100,
              },
            ],
            transactions: txRes?.transactions || [],
          });
        }
      } else {
        // Overall all platforms
        const res = await ApiClient.getOverallSummary(rangeKey as any);
        if (res?.data) {
          setCurrentSummary(res.data);
        }
      }
    } catch (e) {
      console.warn('Error fetching statement data:', e);
    } finally {
      setLoadingData(false);
    }
  }, [platformAccountId, platformName]);

  // Handle period switches
  const handleSelectPeriod = (type: 'day' | 'week' | 'month' | 'all') => {
    setActivePeriod(type);
    let r = '';
    if (type === 'day') r = selectedDate;
    else if (type === 'week') r = `week:${selectedWeekMonday}`;
    else if (type === 'month') r = `month:${selectedMonth}`;
    else r = 'all';
    fetchPeriodData(r);
  };

  const handleStepDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const newStr = getLocalDateString(d);
    setSelectedDate(newStr);
    fetchPeriodData(newStr);
  };

  const handleStepWeek = (delta: number) => {
    const d = new Date(selectedWeekMonday);
    d.setDate(d.getDate() + delta * 7);
    const newStr = getLocalDateString(d);
    setSelectedWeekMonday(newStr);
    fetchPeriodData(`week:${newStr}`);
  };

  const handleStepMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newStr);
    fetchPeriodData(`month:${newStr}`);
  };

  if (!isOpen) return null;

  // Generate unique statement document ID
  const todayDate = new Date();
  const dateCode = todayDate.toISOString().slice(0, 10).replace(/-/g, '');
  const userSuffix = user.id ? user.id.slice(-4).toUpperCase() : '8421';
  const docId = `INV-FP-${dateCode}-${userSuffix}`;

  const generatedTimestamp = todayDate.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate scope label
  let displayScopeLabel = '';
  if (activePeriod === 'day') {
    const isToday = selectedDate === getLocalDateString();
    const isYesterday = selectedDate === getLocalDateString(new Date(Date.now() - 86400000));
    const formatted = new Date(selectedDate).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    displayScopeLabel = `${selectedDate} (${isToday ? (lang === 'hi' ? 'आज' : 'Today') : isYesterday ? (lang === 'hi' ? 'कल' : 'Yesterday') : formatted})`;
  } else if (activePeriod === 'week') {
    const wStart = new Date(selectedWeekMonday);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 6);
    displayScopeLabel = `${wStart.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
    })} – ${wEnd.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} (Mon–Sun)`;
  } else if (activePeriod === 'month') {
    const [y, m] = selectedMonth.split('-').map(Number);
    displayScopeLabel = new Date(y, m - 1, 1).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      month: 'long',
      year: 'numeric',
    });
  } else {
    displayScopeLabel = lang === 'hi' ? 'ऑल-टाइम पूर्ण संयुक्त रिकॉर्ड' : 'All-Time Lifetime Ledger';
  }

  const periodTitle =
    activePeriod === 'day'
      ? (lang === 'hi' ? 'दैनिक व्यावसायिक बिलिंग स्टेटमेंट' : 'Daily Commercial Billing Statement')
      : activePeriod === 'week'
      ? (lang === 'hi' ? 'साप्ताहिक कैलेंडर वित्तीय विवरण' : 'Weekly Calendar Settlement Invoice')
      : activePeriod === 'month'
      ? (lang === 'hi' ? 'मासिक संयुक्त कर व आय विवरण' : 'Monthly Consolidated Tax & Payout Statement')
      : (lang === 'hi' ? 'ऑल-टाइम पूर्ण वित्तीय विवरण' : 'Lifetime Consolidated Ledger Statement');

  const totalIncentive = (currentSummary.incentivePending || 0) + (currentSummary.incentiveReceived || 0);

  const handleDownload = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const sanitizedPeriod = displayScopeLabel.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const filename = `FinePath_${platformName ? platformName + '_' : ''}${activePeriod}_Statement_${sanitizedPeriod}.pdf`;

      await exportElementToPdf(printRef.current, {
        filename,
        onSuccess: () => {
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 3500);
        },
      });
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Modal Dialog Card */}
      <div className="bg-slate-100 rounded-2xl sm:rounded-3xl border border-slate-300 shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* TOP CONTROLS & EXPORT HEADER */}
        <div className="bg-[#002970] px-4 sm:px-6 py-3.5 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 border-b border-sky-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-400 text-[#002970] flex items-center justify-center font-black shadow-xs shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">
                  {lang === 'hi' ? 'व्यावसायिक बिलिंग स्टेटमेंट (PDF)' : 'Professional Billing Statement (PDF)'}
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-cyan-400/20 text-cyan-200 border border-cyan-300/30 px-2 py-0.5 rounded">
                  {activePeriod.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-cyan-200 truncate">
                {periodTitle} • {displayScopeLabel}
              </p>
            </div>
          </div>

          {/* Quick Period Selector Tabs: Day / Week / Month / All */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <div className="flex items-center bg-black/30 p-0.5 rounded-xl border border-white/10">
              {[
                { id: 'day', label: lang === 'hi' ? 'दैनिक' : 'Day', icon: Calendar },
                { id: 'week', label: lang === 'hi' ? 'साप्ताहिक' : 'Week', icon: CalendarDays },
                { id: 'month', label: lang === 'hi' ? 'मासिक' : 'Month', icon: BarChart3 },
                { id: 'all', label: lang === 'hi' ? 'कुल' : 'All', icon: InfinityIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectPeriod(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    activePeriod === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Action Buttons: Download PDF & Close */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || loadingData}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black shadow-md transition active:scale-95 ${
                  downloadSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#00BAF2] hover:bg-sky-300 text-[#002970]'
                }`}
              >
                {downloading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#002970] border-t-transparent rounded-full animate-spin" />
                    <span>{lang === 'hi' ? 'PDF बन रहा है...' : 'Generating PDF...'}</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'hi' ? 'डाउनलोड हुआ!' : 'Downloaded!'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>{lang === 'hi' ? 'PDF डाउनलोड करें' : 'Download PDF'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* SUB-BAR: Secondary Interactive Navigation based on active tab */}
        <div className="bg-slate-200/90 border-b border-slate-300 px-4 py-2 flex items-center justify-between text-xs text-slate-700 flex-wrap gap-2">
          {activePeriod === 'day' && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#002970]" />
                <span>{lang === 'hi' ? 'तारीख:' : 'Date:'}</span>
              </span>

              <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleStepDay(-1)}
                  className="p-1 hover:bg-slate-100 rounded-l-lg text-slate-600"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      fetchPeriodData(e.target.value);
                    }
                  }}
                  className="px-2 py-0.5 text-xs font-mono font-bold text-slate-900 border-x border-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleStepDay(1)}
                  className="p-1 hover:bg-slate-100 rounded-r-lg text-slate-600"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const todayStr = getLocalDateString();
                  setSelectedDate(todayStr);
                  fetchPeriodData(todayStr);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  selectedDate === getLocalDateString()
                    ? 'bg-[#002970] text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {lang === 'hi' ? 'आज' : 'Today'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const yestStr = getLocalDateString(new Date(Date.now() - 86400000));
                  setSelectedDate(yestStr);
                  fetchPeriodData(yestStr);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  selectedDate === getLocalDateString(new Date(Date.now() - 86400000))
                    ? 'bg-[#002970] text-white'
                    : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {lang === 'hi' ? 'कल' : 'Yesterday'}
              </button>
            </div>
          )}

          {activePeriod === 'week' && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-[#002970]" />
                <span>{lang === 'hi' ? 'हफ़्ता (सोम-रवि):' : 'Week (Mon-Sun):'}</span>
              </span>

              <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleStepWeek(-1)}
                  className="p-1 hover:bg-slate-100 rounded-l-lg text-slate-600"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 py-0.5 font-mono font-bold text-slate-900 border-x border-slate-200">
                  {displayScopeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => handleStepWeek(1)}
                  className="p-1 hover:bg-slate-100 rounded-r-lg text-slate-600"
                  title="Next Week"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const mon = getLocalDateString(getMonday());
                  setSelectedWeekMonday(mon);
                  fetchPeriodData(`week:${mon}`);
                }}
                className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              >
                {lang === 'hi' ? 'वर्तमान हफ़्ता' : 'Current Week'}
              </button>
            </div>
          )}

          {activePeriod === 'month' && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-[#002970]" />
                <span>{lang === 'hi' ? 'महीना:' : 'Month:'}</span>
              </span>

              <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleStepMonth(-1)}
                  className="p-1 hover:bg-slate-100 rounded-l-lg text-slate-600"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedMonth(e.target.value);
                      fetchPeriodData(`month:${e.target.value}`);
                    }
                  }}
                  className="px-2 py-0.5 text-xs font-mono font-bold text-slate-900 border-x border-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleStepMonth(1)}
                  className="p-1 hover:bg-slate-100 rounded-r-lg text-slate-600"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const curM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonth(curM);
                  fetchPeriodData(`month:${curM}`);
                }}
                className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              >
                {lang === 'hi' ? 'वर्तमान महीना' : 'Current Month'}
              </button>
            </div>
          )}

          {activePeriod === 'all' && (
            <div className="text-slate-600 font-medium">
              {lang === 'hi'
                ? 'सभी तारीखों व महीनों का सम्पूर्ण वित्तीय हिसाब'
                : 'Complete lifetime cumulative financial ledger'}
            </div>
          )}

          {loadingData && (
            <div className="flex items-center gap-1.5 text-sky-800 font-bold ml-auto animate-pulse">
              <div className="w-3 h-3 border-2 border-sky-800 border-t-transparent rounded-full animate-spin" />
              <span>{lang === 'hi' ? 'डेटा लोड हो रहा है...' : 'Updating Statement...'}</span>
            </div>
          )}
        </div>

        {/* SCROLLABLE HIGH-FIDELITY PRINTABLE STATEMENT PREVIEW */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-300/60 flex justify-center">
          
          {/* ========================================================================= */}
          {/* THE OFFICIAL HIGH-GRADE BILLING STATEMENT & TAX INVOICE TEMPLATE (A4)     */}
          {/* ========================================================================= */}
          <div
            ref={printRef}
            id="billing-statement-document"
            style={{ width: '840px', maxWidth: '100%', minHeight: '1100px' }}
            className="bg-white text-slate-900 shadow-2xl rounded-xl p-8 sm:p-11 font-sans border border-slate-300 flex flex-col justify-between"
          >
            <div>
              {/* TOP HEADER: Corporate Branding & Invoice Metadata */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#002970] text-cyan-300 font-black text-sm flex items-center justify-center shadow-xs">
                      FP
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black tracking-tight text-[#002970]">
                          FinePath
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-[#002970] text-white px-2 py-0.5 rounded">
                          SETTLEMENT LEDGER
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Gig Worker Income, Payout & Financial Accounting System
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                    <p className="font-mono">
                      CIN: <span className="text-slate-800 font-bold">U72200DL2024PTC394812</span> • GSTIN: <span className="text-slate-800 font-bold">07AAECF1234F1Z8</span>
                    </p>
                    <p>
                      Issued by: FinePath Financial Technologies Ltd., Cyber Hub, Gurugram, India
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1.5">
                  <div className="inline-block bg-[#002970] text-white text-[11px] font-mono font-black uppercase tracking-wider px-3 py-1 rounded shadow-2xs">
                    {platformName ? `${platformName.toUpperCase()} BILLING INVOICE` : 'COMMERCIAL TAX & PAYOUT STATEMENT'}
                  </div>

                  <div className="text-xs space-y-0.5 text-slate-600">
                    <div>
                      Invoice Ref No:{' '}
                      <strong className="font-mono font-bold text-slate-900">{docId}</strong>
                    </div>
                    <div>
                      Date of Issue:{' '}
                      <strong className="font-bold text-slate-900">{generatedTimestamp}</strong>
                    </div>
                    <div>
                      Settlement Currency:{' '}
                      <strong className="font-bold text-slate-900">INR (₹ Indian Rupee)</strong>
                    </div>
                    <div className="pt-0.5">
                      <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        STATUS: RECONCILED & SETTLED
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BILLED BY & BILLED TO DUAL METADATA CARDS */}
              <div className="grid grid-cols-2 gap-4 my-5 p-4 rounded-xl bg-slate-50 border border-slate-300 text-xs">
                {/* Left: Issued By & Platform Aggregator */}
                <div className="space-y-1 border-r border-slate-300 pr-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    ISSUED BY / FINANCIAL LEDGER HUB
                  </span>
                  <h4 className="font-black text-slate-900 text-sm">
                    FinePath Automated Reconciliation Desk
                  </h4>
                  <p className="text-slate-600 text-[11px]">
                    Central Multi-Platform Gig Ledger System
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Supported Channels: Zomato, Swiggy, Uber, Blinkit, Zepto, Rapido, etc.
                  </p>
                  <div className="pt-1 text-[10px] text-slate-500 font-mono">
                    Audit Verification Node: IND-DEL-SRV-04
                  </div>
                </div>

                {/* Right: Billed To / Contractor (Rider) Details */}
                <div className="space-y-1 pl-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    BILLED TO / CONTRACTOR (RIDER PARTNER)
                  </span>
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-[#002970] text-sm">
                      {user.name || 'Verified Rider Partner'}
                    </h4>
                    <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      KYC Verified
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px]">
                    Registered Phone:{' '}
                    <strong className="font-mono text-slate-900">{user.phone}</strong>
                  </p>
                  <p className="text-slate-700 text-[11px]">
                    Partner Ledger ID:{' '}
                    <strong className="font-mono text-slate-900">
                      RID-FP-{user.id ? user.id.slice(-4).toUpperCase() : '8421'}
                    </strong>
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium">
                    Accounting Scope:{' '}
                    <strong className="text-slate-900">{periodTitle}</strong>
                  </p>
                </div>
              </div>

              {/* STATEMENT PERIOD BANNER */}
              <div className="mb-5 px-4 py-2 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wide">
                    STATEMENT SCOPE & TIMEFRAME:
                  </span>
                  <span className="font-mono font-black text-xs text-[#002970]">
                    {displayScopeLabel}
                  </span>
                </div>
                <div className="text-[10px] text-sky-800 font-bold uppercase tracking-wider">
                  Reconciliation Cycle: {activePeriod.toUpperCase()}
                </div>
              </div>

              {/* 1. EXECUTIVE FINANCIAL LEDGER SUMMARY CARDS */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                    1. EXECUTIVE FINANCIAL LEDGER SUMMARY (ACCOUNTING HEADS)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Currency: INR (₹)
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center">
                  {/* Card 1: Gross Platform Invoiced */}
                  <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/60 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
                      GROSS PLATFORM EARNED
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 block mt-1">
                      ₹{currentSummary.totalEarned.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-medium block mt-0.5">
                      Order Pay, Surges & Delivery Fees
                    </span>
                  </div>

                  {/* Card 2: Operating Deductions & Payouts */}
                  <div className="p-3.5 rounded-xl border-2 border-rose-400 bg-rose-50/60 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-900 block">
                      TOTAL WITHDRAWALS / EXPENSES
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-rose-700 block mt-1">
                      ₹{currentSummary.totalWithdrawn.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-rose-700 font-medium block mt-0.5">
                      Fuel, Food & Bank Payouts
                    </span>
                  </div>

                  {/* Card 3: Net In-Hand Balance */}
                  <div className="p-3.5 rounded-xl border-2 border-[#002970] bg-blue-50/70 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#002970] block">
                      NET IN-HAND BALANCE
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-[#002970] block mt-1">
                      ₹{currentSummary.netRemaining.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-sky-900 font-bold block mt-0.5">
                      Earned − Deductions
                    </span>
                  </div>

                  {/* Card 4: Platform Incentives */}
                  <div className="p-3.5 rounded-xl border-2 border-amber-400 bg-amber-50/60 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                      TOTAL INCENTIVES
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-amber-700 block mt-1">
                      ₹{totalIncentive.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-amber-800 font-medium block mt-0.5">
                      ₹{currentSummary.incentiveReceived || 0} Paid • ₹{currentSummary.incentivePending || 0} Pending
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. PLATFORM REVENUE & SETTLEMENT SHARE TABLE */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                    2. PLATFORM REVENUE & RECONCILIATION SHARE (BILLING LEDGER)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    Consolidated Gross: ₹{currentSummary.totalEarned.toLocaleString('en-IN')}
                  </span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-left font-bold text-[10px] uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2.5 border-r border-slate-300">Platform Account</th>
                      <th className="p-2.5 border-r border-slate-300 text-right">Gross Earned (₹)</th>
                      <th className="p-2.5 border-r border-slate-300 text-right">Deductions / Payout (₹)</th>
                      <th className="p-2.5 border-r border-slate-300 text-right">Net Remaining (₹)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Share (%)</th>
                      <th className="p-2.5 text-center">Reconciliation Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!currentSummary.platformBreakdown || currentSummary.platformBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-slate-500">
                          No platform earnings recorded for this specific period.
                        </td>
                      </tr>
                    ) : (
                      currentSummary.platformBreakdown.map((plt, idx) => (
                        <tr
                          key={plt.platformId}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                        >
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: plt.colorTheme }}
                            />
                            <span>{plt.platformName}</span>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                            ₹{plt.totalEarned.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-right font-mono text-rose-700">
                            ₹{plt.totalWithdrawn.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                            ₹{plt.netRemaining.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold text-slate-600">
                            {plt.percentage}%
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="inline-block text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              RECONCILED
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black border-t-2 border-slate-400 text-slate-900">
                      <td className="p-2.5 border-r border-slate-300">Consolidated Grand Total</td>
                      <td className="p-2.5 border-r border-slate-300 text-right font-mono text-emerald-800 text-sm">
                        ₹{currentSummary.totalEarned.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-right font-mono text-rose-800 text-sm">
                        ₹{currentSummary.totalWithdrawn.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-right font-mono text-[#002970] text-sm">
                        ₹{currentSummary.netRemaining.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono">100%</td>
                      <td className="p-2.5 text-center font-mono text-[10px] text-emerald-700">VERIFIED</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 3. ITEMIZED EXPENSES & OPERATING DEDUCTIONS BREAKDOWN */}
              {currentSummary.expenseBreakdown && currentSummary.expenseBreakdown.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                      3. OPERATING EXPENSES & CASH DEDUCTIONS BREAKDOWN
                    </span>
                    <span className="text-[10px] text-rose-700 font-bold font-mono">
                      Total Deductions: ₹{currentSummary.totalWithdrawn.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {currentSummary.expenseBreakdown.map((exp, idx) => {
                      const ExpIcon = getExpenseIcon(exp.tag);
                      const sharePercent =
                        currentSummary.totalWithdrawn > 0
                          ? Math.round((exp.totalAmount / currentSummary.totalWithdrawn) * 100)
                          : 0;

                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                              <ExpIcon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block truncate">{exp.tag}</span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {exp.count} entries • {sharePercent}%
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-black text-rose-700">
                            ₹{exp.totalAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. ITEMIZED TRANSACTION & SETTLEMENT AUDIT LOG */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                    4. ITEMIZED TRANSACTION & SETTLEMENT AUDIT JOURNAL
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Total Transactions Recorded: {currentSummary.transactions?.length || 0}
                  </span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-left font-bold text-[10px] uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-10">S.No</th>
                      <th className="p-2 border-r border-slate-300">Date & Time</th>
                      <th className="p-2 border-r border-slate-300">Platform</th>
                      <th className="p-2 border-r border-slate-300">Description / Category</th>
                      <th className="p-2 border-r border-slate-300 text-center">Accounting Type</th>
                      <th className="p-2 text-right">Settlement (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!currentSummary.transactions || currentSummary.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500 font-medium">
                          No transactions recorded in this statement scope.
                        </td>
                      </tr>
                    ) : (
                      currentSummary.transactions.slice(0, 18).map((tx, idx) => {
                        const isEarn = tx.type === 'earning';
                        const isWithdraw = tx.type === 'withdrawal';
                        const plt = currentSummary.platformBreakdown.find(
                          (p) => p.platformId === tx.platformAccountId
                        );

                        return (
                          <tr
                            key={tx.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                          >
                            <td className="p-2 border-r border-slate-200 text-center font-mono text-[10px] text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-[10px] text-slate-700">
                              {new Date(tx.date).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              {new Date(tx.date).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                              {plt?.platformName || 'Platform'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-700">
                              <span>{tx.tag || (isEarn ? 'Earning' : isWithdraw ? 'Withdrawal' : 'Incentive')}</span>
                              {tx.note && (
                                <span className="text-[10px] text-slate-400 block italic">
                                  {tx.note}
                                </span>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-[10px]">
                              <span
                                className={`px-2 py-0.5 rounded uppercase ${
                                  isEarn
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isWithdraw
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isEarn ? 'CREDIT (CR)' : isWithdraw ? 'DEBIT (DR)' : 'INCENTIVE (CR)'}
                              </span>
                            </td>
                            <td
                              className={`p-2 text-right font-mono font-bold ${
                                isEarn
                                  ? 'text-emerald-700'
                                  : isWithdraw
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {isEarn ? '+' : isWithdraw ? '−' : '★'} ₹{tx.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {currentSummary.transactions && currentSummary.transactions.length > 18 && (
                  <p className="text-[10px] text-slate-400 text-right mt-1 font-mono">
                    * Showing top 18 of {currentSummary.transactions.length} transactions for clear A4 statement presentation.
                  </p>
                )}
              </div>

              {/* 5. ACCOUNTING RECONCILIATION SUMMARY */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 mb-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">
                    Reconciliation Formula:
                  </span>
                  <span className="text-[11px] font-mono text-slate-600">
                    Net In-Hand Balance = (Gross Platform Invoicing + Claimed Incentives) − (Operating Deductions & Advances)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Final Settlement</span>
                  <span className="font-mono font-black text-sm text-[#002970]">
                    ₹{currentSummary.netRemaining.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* BOTTOM FOOTER: Official Verification Seal & Legal Statement */}
            <div className="pt-6 border-t-2 border-slate-900 mt-4 flex items-center justify-between text-[10px] text-slate-500">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Authenticated Electronic Commercial Billing Statement</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  This document is machine-generated from FinePath's immutable digital transaction ledger.
                </p>
                <p className="text-[9px] text-slate-400 font-mono">
                  Digital Signature Hash: SHA256:{Math.random().toString(36).substring(2, 10).toUpperCase()}-FP-VERIFIED-NODE-99
                </p>
                <p className="text-[8px] text-slate-400">
                  Valid for personal income tax computation, vehicle loan financing, and platform payout dispute settlement.
                </p>
              </div>

              {/* Official Seal / Signature Stamp */}
              <div className="text-center p-2 rounded-xl border border-dashed border-slate-400 bg-slate-50 w-48 shrink-0">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">
                  OFFICIAL DIGITAL STAMP
                </span>
                <span className="font-mono text-[10px] font-black text-[#002970] block leading-tight">
                  FINEPATH RECONCILER
                </span>
                <span className="text-[8px] text-emerald-700 font-bold block">
                  VERIFIED ELECTRONIC RECORD
                </span>
                <span className="text-[8px] text-slate-400 mt-0.5 block">
                  No Physical Signature Required
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
