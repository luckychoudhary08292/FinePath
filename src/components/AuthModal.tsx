import React, { useState } from 'react';
import { Language, User } from '../types';
import { getT } from '../i18n/translations';
import { ApiClient } from '../services/api';
import { Phone, Lock, User as UserIcon, Globe, ShieldCheck, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { FinePathLogo } from './FinePathLogo';

interface Props {
  lang: Language;
  onToggleLang: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<Props> = ({ lang, onToggleLang, onSuccess }) => {
  const t = getT(lang);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (cleanPhone.replace(/[^\d]/g, '').length < 10) {
      setError(
        lang === 'hi'
          ? 'कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    if (password.trim().length < 6) {
      setError(
        lang === 'hi'
          ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : 'Password must be at least 6 characters long.'
      );
      return;
    }

    if (!isLogin && name.trim().length < 2) {
      setError(
        lang === 'hi'
          ? 'कृपया अपना पूरा नाम दर्ज करें।'
          : 'Please enter your full name.'
      );
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await ApiClient.login({ phone: cleanPhone, password });
      } else {
        res = await ApiClient.signup({
          name: name.trim(),
          phone: cleanPhone,
          password,
          language: lang,
        });
      }

      if (res?.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res?.message || (lang === 'hi' ? 'प्रमाणीकरण विफल रहा।' : 'Authentication failed.'));
      }
    } catch (err: any) {
      setError(err?.message || (lang === 'hi' ? 'कनेक्शन में त्रुटि हुई। कृपया पुनः प्रयास करें।' : 'Network error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-auto">
        {/* Top Header Bar: Language Switch */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'hi' ? 'सुरक्षित प्रमाणीकरण' : 'Secure JWT Auth'}</span>
          </div>

          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition"
          >
            <Globe className="w-3.5 h-3.5 text-[#002970]" />
            <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>
        </div>

        {/* Brand Logo & Name */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2.5">
            <FinePathLogo size={64} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {t.appName}
          </h2>
          <p className="text-xs text-slate-600 font-semibold mt-0.5">
            {lang === 'hi'
              ? 'राइडर व गिग वर्कर धन एवं कमाई ट्रैकर'
              : 'Smart Money Management for Delivery Riders'}
          </p>
        </div>

        {/* Auth Mode Tabs: Login vs Register */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-4 border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              isLogin
                ? 'bg-white text-[#002970] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.login}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              !isLogin
                ? 'bg-white text-[#002970] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t.signup}</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold text-center leading-relaxed animate-shake">
            {error}
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {t.fullName}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {t.phone}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              {t.password}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002970] focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#002970] hover:bg-[#001e54] text-white font-black text-xs rounded-xl shadow-md active:scale-98 transition disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-1">↻</span>
            ) : isLogin ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {loading
                ? lang === 'hi' ? 'सत्यापन हो रहा है...' : 'Authenticating...'
                : isLogin ? t.login : t.signup}
            </span>
          </button>
        </form>

        {/* Switch Account prompt */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-xs font-bold text-[#002970] hover:underline"
          >
            {isLogin ? t.needAccount : t.haveAccount}
          </button>
        </div>

        {/* Security / Privacy Guarantee */}
        <p className="text-[10px] text-slate-600 text-center mt-3 font-medium">
          {lang === 'hi'
            ? '🔒 आपका डेटा पासवर्ड व JWT एन्क्रिप्शन द्वारा सुरक्षित है।'
            : '🔒 All financial entries are isolated and encrypted with JWT.'}
        </p>
      </div>
    </div>
  );
};
