import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Heart, ShoppingBag, Tag, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  // Dynamic icon selector based on content to create bespoke notification badges
  function getToastIcon(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
    const combined = `${title} ${message}`.toLowerCase()
    if (combined.includes('login') || combined.includes('sign in') || combined.includes('auth')) {
      return <Lock className="w-4 h-4 text-rose-600" />
    }
    if (combined.includes('wishlist') || combined.includes('heart') || combined.includes('save')) {
      return <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" />
    }
    if (combined.includes('bag') || combined.includes('cart') || combined.includes('product') || combined.includes('shop')) {
      return <ShoppingBag className="w-4 h-4 text-amber-600" />
    }
    if (combined.includes('coupon') || combined.includes('discount') || combined.includes('save') || combined.includes('off')) {
      return <Tag className="w-4 h-4 text-emerald-600" />
    }

    const icons = {
      success: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      error: <AlertCircle className="w-4 h-4 text-rose-600" />,
      warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      info: <Info className="w-4 h-4 text-neutral-600" />,
    }
    return icons[type] || icons.info
  }

  const indicatorColors = {
    success: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    error: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
    warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
    info: 'bg-neutral-500 shadow-[0_0_8px_rgba(115,115,115,0.4)]',
  }

  const borderColors = {
    success: 'border-emerald-100 bg-white/98 shadow-[0_16px_40px_rgba(16,185,129,0.06),0_4px_12px_rgba(0,0,0,0.02)]',
    error: 'border-rose-100 bg-white/98 shadow-[0_16px_40px_rgba(244,63,94,0.06),0_4px_12px_rgba(0,0,0,0.02)]',
    warning: 'border-amber-100 bg-white/98 shadow-[0_16px_40px_rgba(245,158,11,0.06),0_4px_12px_rgba(0,0,0,0.02)]',
    info: 'border-neutral-200/60 bg-white/98 shadow-[0_16px_40px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.01)]',
  }

  const iconContainers = {
    success: 'bg-emerald-50 border-emerald-100/50',
    error: 'bg-rose-50 border-rose-100/50',
    warning: 'bg-amber-50 border-amber-100/50',
    info: 'bg-neutral-50 border-neutral-100/50',
  }

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto z-[9999] flex flex-col gap-3.5 w-auto md:w-full md:max-w-sm pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const type = (toast.type || 'info') as 'success' | 'error' | 'warning' | 'info'
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`flex items-center gap-3.5 p-3 rounded-2xl border backdrop-blur-md pointer-events-auto transition-all duration-300 ${borderColors[type]}`}
            >
              {/* Vertical Color Indicator Line */}
              <div className={`w-1 h-10 rounded-full flex-shrink-0 ${indicatorColors[type]}`} />
              
              {/* Icon Container Badge */}
              <div className={`flex-shrink-0 p-2 rounded-xl border flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.01)] ${iconContainers[type]}`}>
                {getToastIcon(type, toast.title || '', toast.message || '')}
              </div>
              
              {/* Text Body */}
              <div className="flex-1 space-y-0.5">
                <h4 className="text-xs font-bold text-neutral-900 font-display tracking-tight">
                  {toast.title}
                </h4>
                <p className="text-[10px] leading-relaxed font-semibold text-neutral-500">
                  {toast.message}
                </p>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100/60 rounded-xl transition-colors focus:outline-none"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
