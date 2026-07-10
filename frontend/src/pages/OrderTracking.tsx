import React, { useState } from 'react'
import { Search, Loader2, Check } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

interface TrackResult {
  order_number: string;
  order_status: string;
  payment_status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  shipped_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
}

export default function OrderTracking() {
  const { showToast } = useToastStore()
  const [orderNumber, setOrderNumber] = useState('')
  const [result, setResult] = useState<TrackResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = orderNumber.trim().toUpperCase()
    if (!num) return

    setLoading(true)
    try {
      const res = await fetch(`/api/orders/track/${num}`)
      const data = await res.json()
      if (data.success && data.data) {
        setResult(data.data)
      } else {
        setResult(null)
        showToast('error', 'Not Found', 'No order record found with that number.')
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to connect to order status server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 mt-20 min-h-[50vh] flex flex-col justify-center select-none">
      <div className="border border-gray-100 bg-white rounded-2xl p-8 shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light text-gray-900 font-display italic">Track Order</h1>
          <p className="text-xs text-gray-400 mt-1.5">Check status updates of your shipment</p>
        </div>

        <form onSubmit={handleTrack} className="flex gap-2">
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2 text-xs uppercase focus:outline-none focus:border-primary bg-white"
            placeholder="e.g. HU-20260604-0001-1234"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Track
          </button>
        </form>

        {result && (
          <div className="mt-8 border-t border-gray-100 pt-6 space-y-4 text-xs text-gray-600">
            {/* Stepper Timeline */}
            <div className="py-6 border-b border-gray-100 mb-6">
              <div className="flex items-center justify-between relative">
                {/* Horizontal connection line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-100 -z-10" />
                <div 
                  className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-500 -z-10" 
                  style={{
                    width: result.order_status === 'delivered' ? '100%' :
                           result.order_status === 'out_for_delivery' ? '66%' :
                           result.order_status === 'shipped' ? '33%' : '0%'
                  }}
                />

                {[
                  { label: 'Placed', status: 'placed', date: result.created_at },
                  { label: 'Shipped', status: 'shipped', date: result.shipped_at },
                  { label: 'Out for Delivery', status: 'out_for_delivery', date: result.out_for_delivery_at },
                  { label: 'Delivered', status: 'delivered', date: result.delivered_at }
                ].map((step, idx) => {
                  const statusesList = ['placed', 'shipped', 'out_for_delivery', 'delivered'];
                  const currentIdx = statusesList.indexOf(result.order_status);
                  const stepIdx = statusesList.indexOf(step.status);
                  const isActive = stepIdx <= currentIdx;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center relative bg-white px-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border-2 ${
                        result.order_status === 'cancelled'
                          ? 'border-gray-200 text-gray-400'
                          : isActive
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-400'
                      }`}>
                        {isActive && result.order_status !== 'cancelled' ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-wider mt-1.5 text-center ${
                        isActive ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                      {step.date && (
                        <span className="text-[7px] text-gray-400 mt-0.5">
                          {new Date(step.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <span className="font-bold text-gray-900">Order Number:</span>
              <span className="font-medium text-gray-800">{result.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-900">Shipment Date:</span>
              <span>{new Date(result.created_at).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-900">Order Status:</span>
              <span className="px-2.5 py-0.5 bg-[#f7f5f0] border border-[#ead2ae] text-gray-800 font-bold uppercase rounded-full text-[9px]">
                {result.order_status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-900">Payment Status:</span>
              <span className="uppercase font-bold text-gray-800">{result.payment_status}</span>
            </div>

            {result.tracking_number && (
              <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                <p className="font-bold text-gray-900">Carrier Tracking Details:</p>
                <div className="flex justify-between items-center bg-[#faf9f6] p-2.5 rounded-lg border border-gray-100 mt-2">
                  <span className="font-semibold text-gray-700">Code: {result.tracking_number}</span>
                  {result.tracking_url && (
                    <a
                      href={result.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-bold text-[10px] uppercase tracking-wider"
                    >
                      Track Live Link
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
