import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';

interface AdminAuthProps {
  onAuthSuccess: (user: { name: string; role: string; email: string; permissions?: string[] }) => void;
}

export default function AdminAuth({ onAuthSuccess }: AdminAuthProps) {
  const showToast = useToastStore((state) => state.showToast);

  // Authentication State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // Password Recovery States
  const [resetStep, setResetStep] = useState<'login' | 'forgot_email' | 'reset_otp'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      showToast('error', 'Fields Required', 'Please enter your registered staff email and password.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.toLowerCase().trim(), password: passwordInput })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.step === 'otp_required') {
          setOtpRequired(true);
          setSessionToken(data.data.session_token);
          if (data.data.warning) {
            showToast('warning', 'OTP Bypassed (Local Dev)', data.data.warning);
          } else {
            showToast('info', '2FA Check', 'A 6-digit passcode has been sent to your email.');
          }
        } else {
          const { token, user: loggedUser } = data.data;
          localStorage.setItem('heelsup_token', token);
          localStorage.setItem('heelsup_user', JSON.stringify(loggedUser));
          onAuthSuccess(loggedUser);
          showToast('success', 'Session Established', `Welcome back, ${loggedUser.name}!`);
        }
      } else {
        showToast('error', 'Authentication Failed', data.error || 'Invalid email or password credentials.');
      }
    } catch (err) {
      showToast('error', 'Network Error', 'Failed to connect to the authentication server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.length !== 6) {
      showToast('error', 'Invalid Format', 'Please enter the 6-digit passcode.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/admin-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput, session_token: sessionToken })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const { token, user: loggedUser } = data.data;
        localStorage.setItem('heelsup_token', token);
        localStorage.setItem('heelsup_user', JSON.stringify(loggedUser));
        onAuthSuccess(loggedUser);
        setOtpRequired(false);
        setSessionToken(null);
        setOtpInput('');
        showToast('success', 'OTP Verified', `Access granted for ${loggedUser.name}`);
      } else {
        showToast('error', 'OTP Mismatch', data.error || 'The passcode you entered is invalid.');
      }
    } catch {
      showToast('error', 'Verification Failure', 'Could not complete passcode verification.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast('error', 'Email Required', 'Please enter your registered staff email.');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.toLowerCase().trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'OTP Sent', 'Password reset code has been sent.');
        setResetStep('reset_otp');
      } else {
        showToast('error', 'Request Denied', data.error || 'Account not found.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not trigger forgot password service.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtpCode || !resetNewPassword || !resetConfirmPassword) {
      showToast('error', 'Missing Parameters', 'All password parameters are mandatory.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match.');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.toLowerCase().trim(), otp: resetOtpCode, password: resetNewPassword })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Credentials Reset', 'Your password has been successfully updated.');
        setResetStep('login');
      } else {
        showToast('error', 'Reset Failure', data.error || 'Invalid passcode.');
      }
    } catch {
      showToast('error', 'Network Error', 'Could not establish connection to reset services.');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="max-w-md w-full space-y-8 bg-white border border-neutral-200/80 shadow-2xl p-8 rounded-3xl animate-fade-in text-neutral-900">
      <div className="text-center">
        <span className="text-2xl font-bold tracking-tight text-neutral-900 font-display">HeelsUp</span>
        <h2 className="mt-4 text-xl font-light text-neutral-900 italic">Administration Portal Setup</h2>
        <p className="mt-1.5 text-xs text-neutral-500">Authentication portal gateway verification</p>
      </div>

      {resetStep === 'login' && !otpRequired && (
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Staff Email Address</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="support@heelsup.in"
                className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Access Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs">
              <button
                type="button"
                onClick={() => setResetStep('forgot_email')}
                className="font-medium text-neutral-900 hover:underline transition-colors"
              >
                Forgot access credentials?
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loggingIn}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-neutral-900 hover:bg-neutral-200 focus:outline-none transition-all shadow-md active:scale-95 disabled:bg-neutral-200"
            >
              {loggingIn ? 'Validating...' : 'Secure Sign In'}
            </button>
          </div>
        </form>
      )}

      {otpRequired && (
        <form className="mt-8 space-y-6" onSubmit={handleOtpVerify}>
          <div className="rounded-md space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Two-Factor Passcode (OTP)</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="123456"
                className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-605 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs font-mono text-center tracking-widest transition-all"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loggingIn}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-neutral-900 hover:bg-neutral-200 focus:outline-none transition-all shadow-md active:scale-95 disabled:bg-neutral-200"
            >
              {loggingIn ? 'Verifying...' : 'Verify Passcode'}
            </button>
          </div>
        </form>
      )}

      {resetStep === 'forgot_email' && (
        <form className="mt-8 space-y-6" onSubmit={handleForgotSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Registered Staff Email</label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="support@heelsup.in"
                className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setResetStep('login')}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
            >
              Back to Sign In
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={resettingPassword}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-neutral-900 hover:bg-neutral-200 focus:outline-none transition-all shadow-md active:scale-95 disabled:bg-neutral-200"
            >
              {resettingPassword ? 'Generating OTP...' : 'Send Recovery OTP'}
            </button>
          </div>
        </form>
      )}

      {resetStep === 'reset_otp' && (
        <form className="mt-8 space-y-6" onSubmit={handleResetSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">OTP Recovery Code</label>
              <input
                type="text"
                required
                value={resetOtpCode}
                onChange={(e) => setResetOtpCode(e.target.value)}
                placeholder="123456"
                className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs text-center font-mono tracking-widest"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="appearance-none relative block w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 placeholder-neutral-600 text-neutral-900 rounded-xl focus:outline-none focus:border-primary/50 text-xs"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={resettingPassword}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-neutral-900 hover:bg-neutral-200 focus:outline-none transition-all shadow-md active:scale-95 disabled:bg-neutral-200"
            >
              {resettingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
