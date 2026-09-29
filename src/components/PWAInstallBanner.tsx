import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, X, PlusSquare } from 'lucide-react';
import { Language } from '../types';
import { getT } from '../i18n/translations';

interface Props {
  lang: Language;
}

export const PWAInstallBanner: React.FC<Props> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const t = getT(lang);

  if (isInstalled || dismissed) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await install();
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-[#002970] via-[#003d99] to-[#00BAF2] text-white px-3.5 py-2.5 rounded-2xl mx-3 mt-2 shadow-md flex items-center justify-between gap-3 border border-white/10 animate-fade-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <Download className="w-5 h-5 text-cyan-200" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight truncate">
              {lang === 'hi' ? 'फ़ाइनपाथ ऐप इंस्टॉल करें' : 'Install FinePath'}
            </p>
            <p className="text-[11px] text-cyan-100/90 leading-tight truncate">
              {lang === 'hi' ? 'बिना इंटरनेट के भी चलेगा' : 'Works 1-tap offline while riding'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-white text-[#002970] font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm hover:bg-cyan-50 active:scale-95 transition-all flex items-center gap-1"
          >
            <span>{lang === 'hi' ? 'इंस्टॉल' : 'Install'}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-[#00BAF2]" />
                {lang === 'hi' ? 'iPhone पर इंस्टॉल करें' : 'Install on iPhone / iPad'}
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs text-slate-700">
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-[#002970] text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  1
                </span>
                <p>
                  Safari ब्राउज़र के नीचे{' '}
                  <strong className="inline-flex items-center gap-1 text-sky-600">
                    <Share className="w-3.5 h-3.5" /> Share
                  </strong>{' '}
                  बटन दबाएं।
                </p>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="w-6 h-6 rounded-full bg-[#002970] text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  2
                </span>
                <p>
                  नीचे स्क्रॉल करके{' '}
                  <strong className="inline-flex items-center gap-1 text-slate-900">
                    <PlusSquare className="w-3.5 h-3.5 text-sky-600" /> Add to Home Screen
                  </strong>{' '}
                  चुनें।
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-[#002970] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#001e54] active:scale-98 transition shadow-md"
            >
              {lang === 'hi' ? 'समझ गया' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
