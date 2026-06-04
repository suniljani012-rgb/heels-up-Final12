import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function ForgotPassword() {
  const { showToast } = useToastStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
        showToast('success', 'Reset Code Sent ✉️', 'Please check your mailbox for your recovery link.')
      } else {
        showToast('error', 'Request Failed', data.error || 'Failed to send recovery code.')
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to recovery services.')
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 mt-20 min-h-[50vh] flex flex-col justify-center select-none">
      <div className="border border-gray-100 bg-white rounded-2xl p-8 shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-gray-900 font-display italic">Recover Password</h1>
          <p className="text-xs text-gray-400 mt-1.5">Enter your email to receive recovery instructions</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-gray-600 leading-relaxed bg-[#f7f5f0] border border-[#ead2ae] p-4 rounded-xl">
              An email has been sent to <span className="font-semibold text-gray-900">{email}</span> containing security keys to reset your login password.
            </p>
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4" /> Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors mt-4"
            >
              Send Recovery Key
            </button>
            
            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-semibold">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
