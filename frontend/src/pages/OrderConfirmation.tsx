import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react'

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams()
  const orderNumber = searchParams.get('number') || 'HU-TEMP-ORDER'

  return (
    <div className="max-w-md mx-auto px-6 mt-20 text-center select-none">
      <div className="border border-gray-100 bg-white rounded-2xl p-8 shadow-md flex flex-col items-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mb-6" />
        <h1 className="text-2xl font-light text-gray-900 font-display italic">Order Confirmed!</h1>
        <p className="text-xs text-gray-500 mt-2">
          Thank you for shopping with HeelsUp. Your transaction was processed successfully.
        </p>

        <div className="my-6 p-4 bg-[#f7f5f0] border border-[#ead2ae] rounded-xl w-full">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Order Number</span>
          <span className="text-sm font-bold text-gray-900 mt-1 block tracking-wide select-all">{orderNumber}</span>
        </div>

        <p className="text-[10px] text-gray-400 leading-relaxed mb-8">
          A receipt and tracking details have been sent to your email. Most orders are dispatched from our warehouse in Jodhpur within 24 hours.
        </p>

        <div className="w-full space-y-3">
          <Link
            to="/shop"
            className="w-full py-3 bg-primary hover:bg-[#b17e3f] text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            Continue Shopping <ShoppingBag className="w-4 h-4" />
          </Link>
          
          <Link
            to={`/profile`}
            className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            View Order History <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
