import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react'
import { useWishlistStore } from '../store/useWishlistStore'
import { useCartStore } from '../store/useCartStore'
import { useToastStore } from '../store/useToastStore'
import HeicImage from '../components/HeicImage'

interface Product {
  id: number;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  images: string[];
}

export default function Wishlist() {
  const { items: wishlistIds, toggleItem } = useWishlistStore()
  const { addItem } = useCartStore()
  const { showToast } = useToastStore()

  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWishlistProducts() {
      if (wishlistIds.length === 0) {
        setWishlistProducts([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        // Fetch all active products and filter by wishlist IDs
        const res = await fetch('/api/products?limit=100')
        const data = await res.json()
        if (data.success) {
          const filtered = (data.data as Product[]).filter((p) => wishlistIds.includes(p.id))
          setWishlistProducts(filtered)
        }
      } catch (e) {
        console.error('Fetch wishlist products error:', e)
      } finally {
        setLoading(false)
      }
    }
    loadWishlistProducts()
  }, [wishlistIds])

  const handleRemove = (e: any, id: number, name: string) => {
    e.preventDefault()
    toggleItem(id)
    showToast('info', 'Removed from Wishlist', `${name} has been removed.`)
  }

  const handleAddToCart = async (e: any, prod: Product) => {
    e.preventDefault()
    addItem({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      originalPrice: prod.original_price,
      color: 'Default',
      size: '38',
      img: prod.images?.[0] || '',
      category: prod.category
    })
    // Remove from wishlist
    await toggleItem(prod.id)
    showToast('success', 'Added to Bag 🛍️', `${prod.name} (Size 38) added to your shopping bag & removed from wishlist.`)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-[60vh] select-none">
      <h1 className="text-3xl font-light text-gray-900 font-display italic mb-10 border-b border-gray-100 pb-6">
        Your Wishlist
      </h1>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="bg-gray-100 rounded-xl aspect-square w-full" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : wishlistProducts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-xl bg-white flex flex-col items-center justify-center">
          <Heart className="w-16 h-16 text-gray-300 stroke-1" />
          <p className="mt-4 text-sm text-gray-500 font-medium">You haven't saved any items yet</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#b17e3f] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            Explore Shop <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {wishlistProducts.map((prod) => (
            <Link
              key={prod.id}
              to={`/product?id=${prod.id}`}
              className="group flex flex-col gap-3 relative border border-gray-50 bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div className="relative rounded-lg overflow-hidden bg-gray-50 aspect-square">
                <HeicImage
                  src={prod.images?.[0]}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                
                {/* Delete button top right */}
                <button
                  onClick={(e) => handleRemove(e, prod.id, prod.name)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/95 text-gray-400 hover:text-rose-600 shadow-sm transition-colors"
                  title="Remove from wishlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest capitalize">{prod.category}</span>
                <h3 className="text-xs font-semibold text-gray-800 line-clamp-1">{prod.name}</h3>
                
                <span className="text-xs font-bold text-gray-900 mt-1 block">
                  ₹{(prod.price / 100).toLocaleString('en-IN')}
                </span>

                <button
                  onClick={(e) => handleAddToCart(e, prod)}
                  className="mt-3 w-full py-2 bg-primary hover:bg-[#b17e3f] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Add to Bag
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
