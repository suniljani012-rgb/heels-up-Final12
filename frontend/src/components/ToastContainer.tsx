import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  }

  const borderColors = {
    success: 'border-emerald-100 bg-emerald-50/80 backdrop-blur-md',
    error: 'border-rose-100 bg-rose-50/80 backdrop-blur-md',
    warning: 'border-amber-100 bg-amber-50/80 backdrop-blur-md',
    info: 'border-blue-100 bg-blue-50/80 backdrop-blur-md',
  }

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto z-[9999] flex flex-col gap-3 w-auto md:w-full md:max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-start gap-3 p-4 border rounded-xl shadow-lg pointer-events-auto ${borderColors[toast.type]}`}
          >
            <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900">{toast.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
