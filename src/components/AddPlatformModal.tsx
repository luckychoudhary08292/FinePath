import React, { useState } from 'react';
import { Language, PlatformAccount } from '../types';
import { getT } from '../i18n/translations';
import { TOP_PREDEFINED_PLATFORMS, PredefinedPlatform } from '../constants/predefinedPlatforms';
import { X, Plus, Check, Sparkles, Paintbrush } from 'lucide-react';

interface Props {
  lang: Language;
  isOpen: boolean;
  existingPlatforms?: PlatformAccount[];
  onClose: () => void;
  onAdd: (name: string, color: string, icon: string) => Promise<void>;
}

const COLOR_PALETTE = [
  '#002970',
  '#CB202D',
  '#FC8019',
  '#F8CB46',
  '#FFCC00',
  '#8B5CF6',
  '#1565C0',
  '#00BFA5',
  '#E0533C',
  '#10B981',
  '#000000',
  '#D97706',
];

export const AddPlatformModal: React.FC<Props> = ({
  lang,
  isOpen,
  existingPlatforms = [],
  onClose,
  onAdd,
}) => {
  const t = getT(lang);
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined');
  const [platformName, setPlatformName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#002970');
  const [loading, setLoading] = useState(false);
  const [addingName, setAddingName] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPlatformAdded = (name: string) => {
    return existingPlatforms.some(
      (p) => p.platformName.trim().toLowerCase() === name.trim().toLowerCase()
    );
  };

  const handle1TapAdd = async (preset: PredefinedPlatform) => {
    if (isPlatformAdded(preset.name) || addingName) return;
    setAddingName(preset.name);
    try {
      await onAdd(preset.name, preset.color, preset.icon);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingName(null);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName.trim()) return;

    setLoading(true);
    try {
      const initial = platformName.trim().charAt(0).toUpperCase();
      await onAdd(platformName.trim(), selectedColor, initial);
      setPlatformName('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#002970]" />
              {t.addPlatform}
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              {lang === 'hi'
                ? 'लोकप्रिय डिलीवरी कंपनियों में से चुनें या कस्टम नाम बनाएं'
                : 'Choose from top gig platforms or create a custom one'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Predefined vs Custom */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl my-3.5 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('predefined')}
            className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'predefined'
                ? 'bg-white text-[#002970] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'लोकप्रिय प्लेटफ़ॉर्म' : 'Top Predefined'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'custom'
                ? 'bg-white text-[#002970] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'कस्टम प्लेटफ़ॉर्म' : 'Custom Platform'}</span>
          </button>
        </div>

        {/* TAB 1: Predefined Top Platforms */}
        {activeTab === 'predefined' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 font-medium">
              {lang === 'hi'
                ? 'किसी भी प्लेटफ़ॉर्म पर 1-टैप करके अपने होम स्क्रीन पर जोड़ें:'
                : 'Tap any platform to instantly add it to your dashboard:'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TOP_PREDEFINED_PLATFORMS.map((preset) => {
                const isAdded = isPlatformAdded(preset.name);
                const isAdding = addingName === preset.name;

                return (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={isAdded || isAdding}
                    onClick={() => handle1TapAdd(preset)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isAdded
                        ? 'border-emerald-200 bg-emerald-50/70 opacity-75 cursor-default'
                        : 'border-slate-200/90 hover:border-[#002970] hover:bg-sky-50 active:scale-97'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: preset.color }}
                      >
                        {preset.icon}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-black text-slate-900 block truncate">
                          {preset.name}
                        </span>
                        <span className="text-[9px] text-slate-500 font-semibold block truncate">
                          {lang === 'hi' ? preset.categoryHi : preset.category}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 ml-1.5">
                      {isAdded ? (
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-black">
                          {isAdding ? '...' : '+'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-semibold">
                {lang === 'hi' ? 'अलग नाम जोड़ना चाहते हैं?' : 'Need to add a different brand?'}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className="text-xs font-black text-[#002970] hover:underline"
              >
                {lang === 'hi' ? '→ कस्टम फॉर्म खोलें' : '→ Switch to Custom'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Custom Platform Creation */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {t.platformName}
              </label>
              <input
                type="text"
                required
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder={lang === 'hi' ? 'जैसे Local Courier, Kirana App' : 'e.g. Local Delivery, City Express'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002970] focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                {t.customColor}
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {COLOR_PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-xs"
                    style={{ backgroundColor: c }}
                  >
                    {selectedColor === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xs"
                style={{ backgroundColor: selectedColor }}
              >
                {platformName.trim().charAt(0).toUpperCase() || 'P'}
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 block">
                  {platformName.trim() || (lang === 'hi' ? 'प्लेटफ़ॉर्म का नाम' : 'Platform Preview')}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {lang === 'hi' ? 'कस्टम डिलीवरी खाता' : 'Custom delivery account'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={loading || !platformName.trim()}
                className="flex-1 py-3 rounded-xl bg-[#002970] text-white font-bold text-xs hover:bg-[#001e54] shadow-md transition disabled:opacity-50"
              >
                {loading ? '...' : t.save}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
