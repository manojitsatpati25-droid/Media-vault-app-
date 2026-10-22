import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  User,
  Sparkles,
  Lock,
  Smartphone,
  ChevronDown,
  Info,
} from 'lucide-react';
import { UserProfile, AuthStep } from '../types';

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80',
];

export const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [step, setStep] = useState<AuthStep>('phone');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [demoOtpCode, setDemoOtpCode] = useState('789012');
  const [timer, setTimer] = useState(30);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // User Profile details
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [errorMsg, setErrorMsg] = useState('');

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 7) {
      setErrorMsg('Please enter a valid phone number (at least 7 digits)');
      return;
    }

    setErrorMsg('');
    setIsSendingOtp(true);

    // Generate a random 6-digit verification code for demo
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setDemoOtpCode(generatedCode);

    setTimeout(() => {
      setIsSendingOtp(false);
      setStep('otp');
      setTimer(30);
      // Pre-populate display name based on phone suffix if blank
      if (!displayName) {
        setDisplayName(`User_${cleanNumber.slice(-4)}`);
      }
    }, 800);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleAutoFillDemoCode = () => {
    const codeArr = demoOtpCode.split('');
    setOtp(codeArr);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (enteredCode !== demoOtpCode && enteredCode !== '123456') {
      setErrorMsg(`Invalid verification code. Try ${demoOtpCode} or 123456.`);
      return;
    }

    setErrorMsg('');
    setStep('profile');
  };

  const handleCompleteProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('Please enter a display name');
      return;
    }

    const fullPhone = `${countryCode} ${phoneNumber}`;
    const userProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      phoneNumber: fullPhone,
      countryCode,
      name: displayName.trim(),
      avatarUrl: selectedAvatar,
      joinedAt: new Date().toISOString(),
      isVerified: true,
    };

    onLoginSuccess(userProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 transition-all">
        
        {/* Glow ambient background element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                <Phone className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {step === 'phone' && 'Phone Verification'}
                {step === 'otp' && 'Enter SMS Code'}
                {step === 'profile' && 'Complete Profile'}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 'phone' && 'Sign in or register with your mobile number'}
                {step === 'otp' && `OTP sent to ${countryCode} ${phoneNumber}`}
                {step === 'profile' && 'Personalize your Media Vault channel'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Steps */}
        <div className="p-6 space-y-5 relative z-10">

          {/* STEP 1: Phone Number Entry */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Country Code & Mobile Number
                </label>
                <div className="flex gap-2">
                  {/* Country Selector */}
                  <div className="relative shrink-0">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 pr-8 text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>

                  {/* Phone Input */}
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 555-0199 or 9876543210"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Security Hint */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  We will simulate sending a 6-digit SMS verification passcode to your phone.
                </span>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-medium">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isSendingOtp}
                className="w-full py-3 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending SMS Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Enter OTP Passcode */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              
              {/* Simulated SMS Notification Banner */}
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Smartphone className="w-4 h-4 text-cyan-400 animate-bounce" />
                  <div>
                    <span className="font-semibold block">Simulated SMS Received!</span>
                    <span className="text-[11px] text-slate-400">Verification Code: <strong className="text-cyan-200 font-mono text-sm">{demoOtpCode}</strong></span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillDemoCode}
                  className="px-2.5 py-1 bg-cyan-500 text-slate-950 font-bold rounded-lg text-[11px] hover:bg-cyan-400 transition-colors"
                >
                  Auto-Fill
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
                  6-Digit Passcode
                </label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-11 h-12 text-center bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-lg font-mono font-bold text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  ))}
                </div>
              </div>

              {/* Resend Timer */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Change number
                </button>

                {timer > 0 ? (
                  <span>Resend code in <strong className="text-slate-200 font-mono">{timer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTimer(30);
                      setDemoOtpCode(Math.floor(100000 + Math.random() * 900000).toString());
                    }}
                    className="text-cyan-400 font-semibold hover:underline"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-medium">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Continue</span>
              </button>
            </form>
          )}

          {/* STEP 3: Complete Profile */}
          {step === 'profile' && (
            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Media Creator"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Choose Avatar Icon
                </label>
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Avatar"
                      onClick={() => setSelectedAvatar(url)}
                      className={`w-12 h-12 rounded-full object-cover cursor-pointer border-2 transition-all ${
                        selectedAvatar === url
                          ? 'border-cyan-400 scale-110 shadow-md shadow-cyan-500/30'
                          : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Verified Phone:</span>
                  <span className="font-mono text-slate-200 font-semibold">{countryCode} {phoneNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Account Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> SMS Verified
                  </span>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-medium">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Enter Media Vault</span>
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
