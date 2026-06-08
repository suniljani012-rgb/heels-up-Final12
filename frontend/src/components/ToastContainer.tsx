import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#b17e3f]" />,
    error: <AlertCircle className="w-5 h-5 text-[#d4456b]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#b17e3f]" />,
    info: <Info className="w-5 h-5 text-gray-700" />,
  }

  const borderColors = {
    success: 'border-[#ead2ae] bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-l-4 border-l-[#b17e3f]',
    error: 'border-rose-200 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-l-4 border-l-[#d4456b]',
    warning: 'border-amber-200 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-l-4 border-l-[#ead2ae]',
    info: 'border-gray-200 bg-white/95 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-l-4 border-l-gray-900',
  }

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto z-[9999] flex flex-col gap-3.5 w-auto md:w-full md:max-w-sm pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className={`flex items-start gap-3.5 p-4 rounded-xl border backdrop-blur-md pointer-events-auto transition-all ${borderColors[toast.type]}`}
          >
            <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 font-display">{toast.title}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-600 font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 text-gray-400 rounded-full hover:bg-gray-150/50 hover:text-gray-750 transition-colors focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
