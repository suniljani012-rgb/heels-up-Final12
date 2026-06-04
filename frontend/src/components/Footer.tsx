import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const { showToast } = useToastStore()
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setCategories(data.data)
        }
      })
      .catch(err => console.error("Error loading categories in footer:", err))
  }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const emailVal = email.trim()
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Subscribed! 🎉', 'You have been successfully added to our mailing list.')
        setEmail('')
      } else {
        showToast('error', 'Subscription Failed', data.error || 'Please try again later.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not connect to the subscription server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <footer className="bg-gray-950 text-gray-400 text-xs border-t border-gray-900 mt-20 pt-16 pb-8 select-none">
      <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-gray-900 pb-12">
        {/* Brand & Newsletter */}
        <div className="flex flex-col gap-6">
          {logoFailed ? (
            <span className="text-lg font-light tracking-widest text-white font-display italic select-none">
              Heels<span className="font-semibold text-primary">Up</span>
            </span>
          ) : (
            <img
              src="/logo.png"
              alt="HeelsUp Logo"
              className="h-10 w-fit object-contain invert mix-blend-screen"
              onError={() => setLogoFailed(true)}
            />
          )}
          <p className="leading-relaxed text-gray-500">
            India's premier online store for luxury ladies heels, flats, sandals, wedges & bags. 20,000+ happy customers.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
            <input
              type="email"
              placeholder="Your email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-primary disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 bg-primary hover:bg-[#b17e3f] text-white font-semibold rounded-lg transition-colors uppercase tracking-wider text-[10px] disabled:opacity-50"
            >
              Join
            </button>
          </form>
        </div>

        {/* Collections */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Collections</h4>
          <ul className="space-y-2.5">
            {categories.length === 0 ? (
              <>
                <li><Link to="/shop?cat=heels" className="hover:text-white transition-colors">Premium Heels</Link></li>
                <li><Link to="/shop?cat=flats" className="hover:text-white transition-colors">Comfort Flats</Link></li>
                <li><Link to="/shop?cat=sandals" className="hover:text-white transition-colors">Chic Sandals</Link></li>
                <li><Link to="/shop?cat=bags" className="hover:text-white transition-colors">Luxury Handbags</Link></li>
              </>
            ) : (
              categories.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/shop?cat=${cat.slug || cat.name.toLowerCase()}`} className="hover:text-white transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Support */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Support & Info</h4>
          <ul className="space-y-2.5">
            <li><Link to="/shipping-info" className="hover:text-white transition-colors">Shipping & Delivery</Link></li>
            <li><Link to="/returns" className="hover:text-white transition-colors">Exchange & Returns</Link></li>
            <li><Link to="/size-guide" className="hover:text-white transition-colors">Size Guide</Link></li>
            <li><Link to="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
          </ul>
        </div>

        {/* Contact info */}
        <div className="flex flex-col gap-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Get in Touch</h4>
          <ul className="space-y-3.5 text-gray-500">
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Jodhpur, Rajasthan, India</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <span>+91 98290 12345</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <span>support@heelsup.in</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-[10px] text-gray-600 font-medium">
          &copy; {new Date().getFullYear()} HeelsUp. All Rights Reserved. Made in Jodhpur.
        </p>

        {/* Social Icons & Cards */}
        <div className="flex items-center gap-6">
          {/* Social */}
          <div className="flex items-center gap-4 text-gray-600">
            <a href="https://instagram.com/heelsup.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              <i className="fa-brands fa-instagram text-base"></i>
            </a>
            <a href="https://facebook.com/heelsup.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              <i className="fa-brands fa-facebook text-base"></i>
            </a>
            <a href="https://twitter.com/heelsup.in" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              <i className="fa-brands fa-x-twitter text-base"></i>
            </a>
          </div>

          {/* Cards */}
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-md p-1 px-2 select-none">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mr-1">Secured Payments</span>
            <i className="fa-brands fa-cc-visa text-gray-400 hover:text-white text-sm transition-colors" />
            <i className="fa-brands fa-cc-mastercard text-gray-400 hover:text-white text-sm transition-colors" />
            <i className="fa-brands fa-google-pay text-gray-400 hover:text-white text-base transition-colors" />
            <span className="text-[9px] text-emerald-500 font-extrabold uppercase">UPI</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
