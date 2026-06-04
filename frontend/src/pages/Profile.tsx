import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, Package, Mail, User, Shield } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
  items?: { name: string; image: string; size: string; qty: number; price: number }[];
}

export default function Profile() {
  const { user, token, logout } = useAuthStore()
  const { showToast } = useToastStore()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Auth redirect
  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    async function fetchMyOrders() {
      try {
        const res = await fetch('/api/orders/my', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (data.success) {
          setOrders(data.data)
        }
      } catch (e) {
        console.error('Fetch orders error:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchMyOrders()
  }, [token])

  const handleLogout = () => {
    logout()
    showToast('info', 'Logged Out', 'You have logged out of your account.')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-24 animate-pulse space-y-6">
        <div className="h-10 bg-gray-100 rounded w-1/4" />
        <div className="h-40 bg-gray-100 rounded w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-[70vh] select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Card: Customer Profile Summary */}
        <div className="lg:col-span-4 border border-gray-100 rounded-xl p-6 bg-white shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-900 font-display italic border-b border-gray-100 pb-3">
            Account Details
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Full Name</span>
                <span className="text-xs font-semibold text-gray-900">{user?.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Email Address</span>
                <span className="text-xs font-semibold text-gray-900">{user?.email}</span>
              </div>
            </div>

            {user?.phone && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Contact Phone</span>
                  <span className="text-xs font-semibold text-gray-900">{user.phone}</span>
                </div>
              </div>
            )}

            {user?.role && (user.role === 'admin' || user.role === 'staff') && (
              <div className="flex items-center gap-3 bg-red-50/50 border border-red-100 rounded-lg p-2.5">
                <Shield className="w-4 h-4 text-[#d4456b] flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-[#d4456b] font-bold uppercase tracking-wider block">Staff Access</span>
                  <Link to="/admin" className="text-xs font-semibold text-primary hover:underline">
                    Go to Admin Workspace
                  </Link>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-6 py-2.5 border border-gray-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 text-gray-700"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Right Card: Order Logs */}
        <div className="lg:col-span-8 space-y-6">
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 font-display italic border-b border-gray-100 pb-3 flex items-center gap-1.5 mb-6">
              <Package className="w-5 h-5 text-primary" /> Purchase History
            </h2>

            {orders.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-100 rounded-xl text-gray-500 text-xs">
                You haven't placed any orders yet.
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="border border-gray-100 rounded-xl p-4 bg-[#fcfbf9] hover:bg-[#faf9f5] transition-colors">
                    {/* Header line */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3 text-xs text-gray-500">
                      <div>
                        Order <span className="font-bold text-gray-900">{order.order_number}</span> &middot;{' '}
                        {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                          order.order_status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.order_status === 'cancelled'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {order.order_status}
                        </span>
                        <span className="px-2.5 py-0.5 bg-gray-100 rounded-full font-bold uppercase text-[9px] text-gray-600">
                          Payment: {order.payment_status}
                        </span>
                      </div>
                    </div>

                    {/* Items snippet */}
                    {order.items && order.items.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <img
                              src={item.image || '/assets/placeholder.jpg'}
                              alt=""
                              className="w-10 h-10 object-cover rounded-md bg-white border border-gray-100 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-gray-800 truncate">{item.name}</h4>
                              <p className="text-[9px] text-gray-400">Qty: {item.qty} &middot; Size: {item.size}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total info */}
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-3">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total paid</span>
                      <span className="text-sm font-bold text-gray-950">
                        ₹{(order.total_amount / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
