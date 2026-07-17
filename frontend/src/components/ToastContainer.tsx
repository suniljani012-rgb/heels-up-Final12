import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    info: <Info className="w-4 h-4 text-neutral-600" />,
  }

  const borderColors = {
    success: 'border-emerald-100 bg-white/95 shadow-[0_16px_40px_rgba(16,185,129,0.06),0_4px_12px_rgba(0,0,0,0.02)]',
    error: 'border-rose-100 bg-white/95 shadow-[0_16px_40px_rgba(244,63,94,0.06),0_4px_12px_rgba(0,0,0,0.02)]',
    warning: 'border-amber-100 bg-white/95 shadow-[0_16px_40px_rgba(245,158,11,0.06),0_4px_12px_rgba(0,0,0,0.02)]',
    info: 'border-neutral-100 bg-white/95 shadow-[0_16px_40px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.01)]',
  }

  const textColors = {
    success: { title: 'text-emerald-950', body: 'text-emerald-800/90' },
    error: { title: 'text-rose-950', body: 'text-rose-800/90' },
    warning: { title: 'text-amber-950', body: 'text-amber-800/90' },
    info: { title: 'text-neutral-900', body: 'text-neutral-600/90' },
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
          const type = toast.type || 'info'
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`flex items-start gap-4 p-4.5 rounded-2xl border backdrop-blur-md pointer-events-auto transition-all duration-300 ${borderColors[type]}`}
            >
              <div className={`flex-shrink-0 mt-0.5 p-2 rounded-xl border flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${iconContainers[type]}`}>
                {icons[type]}
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className={`text-[11px] font-extrabold uppercase tracking-wider font-display ${textColors[type].title || 'text-gray-900'}`}>
                  {toast.title}
                </h4>
                <p className={`text-[10px] leading-relaxed font-semibold ${textColors[type].body || 'text-gray-600'}`}>
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100/60 rounded-lg transition-colors focus:outline-none"
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
