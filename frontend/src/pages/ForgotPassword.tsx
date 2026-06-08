import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, Lock, KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function ForgotPassword() {
  const { showToast } = useToastStore()
  const navigate = useNavigate()

  // Steps: 'email' or 'otp'
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.status === 404) {
        showToast('error', 'Account Not Found 🔍', 'This email is not registered with HeelsUp. Redirecting to registration...')
        setTimeout(() => {
          navigate('/register')
        }, 2000)
        return
      }
      if (data.success) {
        setStep('otp')
        showToast('success', 'Reset Code Sent ✉️', 'Please check your mailbox for your recovery link.')
      } else {
        showToast('error', 'Request Failed', data.error || 'Failed to send recovery code.')
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to recovery services.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || !password || !confirmPassword) return

    if (password.length < 8) {
      showToast('warning', 'Weak Password', 'Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      showToast('warning', 'Passwords Mismatch', 'New Password and Confirm Password do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Password Updated! 🎉', 'Your password has been successfully reset. Please login.')
        navigate('/login')
      } else {
        showToast('error', 'Reset Failed', data.error || 'Invalid OTP code or email.')
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to complete password reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 mt-20 min-h-[50vh] flex flex-col justify-center select-none">
      <div className="border border-gray-100 bg-white rounded-2xl p-8 shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-gray-900 font-display italic">Recover Password</h1>
          <p className="text-xs text-gray-400 mt-1.5">
            {step === 'email' 
              ? 'Enter your email to receive recovery instructions' 
              : 'Enter the verification code and set your new password'}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors mt-4 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                </>
              ) : (
                'Send Recovery Code'
              )}
            </button>
            
            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-semibold">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-start gap-2.5 mb-4 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-emerald-800 leading-relaxed">
                Verification code has been sent to <span className="font-semibold">{email}</span>. Please check your inbox.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Verification Code (OTP)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary tracking-widest font-mono text-center font-bold"
                  placeholder="------"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Confirm New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors mt-4 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-[10px] font-bold text-gray-500 hover:text-gray-900 uppercase tracking-wider flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <Link to="/login" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
