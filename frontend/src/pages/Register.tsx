import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Phone, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function Register() {
  const { showToast } = useToastStore()
  const navigate = useNavigate()

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!email) {
      showToast('warning', 'Email Required', 'Please enter your email address to verify.')
      return
    }
    setSendingOtp(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'register' }),
      })
      const data = await res.json()
      if (data.success) {
        setOtpSent(true)
        showToast('success', 'Verification OTP Sent 📧', `We sent a 6-digit code to ${email}.`)
      } else {
        showToast('error', 'Failed to send OTP', data.error || 'Verification email could not be sent.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not connect to the server.')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !phone || !password || !confirmPassword) {
      showToast('warning', 'Missing Details', 'Please fill in all the required fields.')
      return
    }

    if (password.length < 8) {
      showToast('warning', 'Weak Password', 'Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      showToast('warning', 'Passwords Mismatch', 'Password and Confirm Password do not match.')
      return
    }

    if (!otp) {
      showToast('warning', 'Verification Required', 'Please request and enter verification OTP sent to your email.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, otp }),
      })
      const data = await res.json()
      
      if (data.success) {
        showToast('success', 'Registration Successful! 🎉', 'Your account has been created. Please log in.')
        navigate('/login')
      } else {
        showToast('error', 'Registration Failed', data.error || 'Failed to create account.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 select-none overflow-hidden bg-gradient-to-b from-[#fdfbf7] to-[#f9f6f0]">
      {/* Decorative luxury backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#ead2ae]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#d4456b]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-md border border-gray-150/50 rounded-2xl p-8 md:p-10 shadow-xl shadow-gray-200/50 relative z-10 transition-all hover:shadow-2xl hover:shadow-gray-200/60 duration-500">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-primary/10 rounded-full text-[10px] text-primary font-bold uppercase tracking-widest mb-3">
            Join HeelsUp
          </div>
          <h1 className="text-3xl font-light text-gray-900 font-display italic tracking-wide">Create Account</h1>
          <p className="text-xs text-gray-400 mt-2 font-medium">Elevate your collection. Track orders & save wishlists.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary transition-colors">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all duration-300 placeholder-gray-400"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
            <div className="relative group flex gap-2">
              <div className="relative flex-1 group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary transition-colors">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  disabled={otpSent}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all duration-300 placeholder-gray-400 disabled:opacity-75"
                  placeholder="you@example.com"
                />
              </div>
              {!otpSent && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !email}
                  className="px-4 py-3 bg-gray-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50 shrink-0"
                >
                  {sendingOtp ? 'Sending...' : 'Send OTP'}
                </button>
              )}
            </div>
          </div>

          {/* OTP input (only show if OTP is sent) */}
          {otpSent && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Verification Code (OTP)</label>
              <div className="relative group flex gap-2">
                <div className="relative flex-1 group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary transition-colors">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all duration-300 placeholder-gray-400 font-mono tracking-widest text-center"
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(''); }}
                  className="px-3 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors shrink-0"
                >
                  Change
                </button>
              </div>
              <p className="text-[9px] text-emerald-600 font-medium">An OTP code has been sent to your email. Enter it above to verify.</p>
            </div>
          )}

          {/* Phone Number input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary transition-colors">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all duration-300 placeholder-gray-400"
                placeholder="Enter 10-digit mobile number"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <div className="relative group flex items-center">
              <span className="absolute left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary transition-colors">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all duration-300 placeholder-gray-400"
                placeholder="Choose a strong password (min 8 chars)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
            <div className="relative group flex items-center">
              <span className="absolute left-0 pl-3.5 flex items-center text-gray-400 group-focus-within:text-primary transition-colors">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all duration-300 placeholder-gray-400"
                placeholder="Re-enter your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl uppercase tracking-widest transition-all hover:tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-6 hover:shadow-lg hover:shadow-gray-900/10 active:scale-[0.98] duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Creating Account...
              </>
            ) : (
              <>
                Register Account <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-gray-100 pt-6 mt-8 text-center text-xs text-gray-500 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:text-[#b17e3f] underline underline-offset-4 decoration-primary/30 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
