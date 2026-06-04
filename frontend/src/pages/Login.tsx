import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'

export default function Login() {
  const { login } = useAuthStore()
  const { showToast } = useToastStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || ''

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      
      if (data.success && data.data) {
        const { token, user } = data.data
        login(token, user)
        showToast('success', 'Welcome Back! 👋', `Logged in successfully as ${user.name}.`)
        
        // Redirect based on role
        if (redirect) {
          navigate(redirect)
        } else if (user.role === 'admin' || user.role === 'staff') {
          navigate('/admin')
        } else {
          navigate('/profile')
        }
      } else {
        showToast('error', 'Login Failed', data.error || 'Invalid email or password.')
      }
    } catch {
      showToast('error', 'Authentication Error', 'Could not connect to the auth server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 mt-20 min-h-[50vh] flex flex-col justify-center select-none">
      <div className="border border-gray-100 bg-white rounded-2xl p-8 shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-gray-900 font-display italic">Sign In</h1>
          <p className="text-xs text-gray-400 mt-1.5">Access your HeelsUp account details</p>
        </div>

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

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Password</label>
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
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verification in progress...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="border-t border-gray-100 pt-6 mt-6 text-center text-xs text-gray-500">
          New to HeelsUp?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  )
}
