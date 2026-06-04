import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Star, Heart, ShoppingBag, Truck, RefreshCw, Ruler, MessageSquare } from 'lucide-react'
import { useCartStore } from '../store/useCartStore'
import { useWishlistStore } from '../store/useWishlistStore'
import { useToastStore } from '../store/useToastStore'

interface ProductDetail {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number; // in paise
  original_price: number | null;
  description: string;
  rating: number;
  review_count: number;
  sizes: string[];
  size_stock: Record<string, number>;
  images: string[];
  stock: number;
}

interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  reviewer_name: string;
}

export default function Product() {
  const [searchParams] = useSearchParams()
  const productId = searchParams.get('id') || ''
  
  const { addItem } = useCartStore()
  const { toggleItem, hasItem } = useWishlistStore()
  const { showToast } = useToastStore()

  // Dynamic States
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [images, setImages] = useState<string[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [activeImage, setActiveImage] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor] = useState('Default')
  const [qty, setQty] = useState(1)
  const [showSizeGuide, setShowSizeGuide] = useState(false)

  // Review Form States
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBody, setReviewBody] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Fetch details
  useEffect(() => {
    if (!productId) return
    async function fetchDetails() {
      setLoading(true)
      try {
        const res = await fetch(`/api/products/${productId}`)
        const data = await res.json()
        if (data.success && data.data) {
          const detail = data.data.product
          setProduct(detail)
          setReviews(data.data.reviews || [])
          
          // Image array assembly
          const fetchedImgs = data.data.images?.map((i: any) => i.url) || []
          const allImages = fetchedImgs.length > 0 ? fetchedImgs : (detail.images || [])
          setImages(allImages)
          if (allImages.length > 0) setActiveImage(allImages[0])

          // Sizes default selector
          if (detail.sizes?.length > 0) {
            setSelectedSize(detail.sizes[0])
          }

          // Fetch related products
          const relatedRes = await fetch(`/api/products?limit=4&cat=${detail.category}`)
          const relatedData = await relatedRes.json()
          if (relatedData.success) {
            setRelated(relatedData.data.filter((r: any) => r.id !== detail.id))
          }
        }
      } catch (e) {
        console.error('Fetch product detail error:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [productId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-24 animate-pulse flex flex-col md:flex-row gap-12">
        <div className="flex-1 bg-gray-100 h-96 rounded-xl" />
        <div className="flex-1 space-y-6">
          <div className="h-8 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-20 bg-gray-100 rounded w-full" />
          <div className="h-12 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-24 text-center">
        <p className="text-gray-500 font-medium">Product details could not be loaded.</p>
      </div>
    )
  }

  const inWishlist = hasItem(product.id)
  const isOutOfStock = product.size_stock && selectedSize ? (product.size_stock[selectedSize] || 0) <= 0 : product.stock <= 0
  const originalPrice = product.original_price
  const discount = originalPrice ? Math.round(100 - (product.price / originalPrice) * 100) : 0

  const handleAddToCart = () => {
    if (isOutOfStock) {
      showToast('warning', 'Out of Stock', 'The selected size is currently out of stock.')
      return
    }
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price,
      color: selectedColor,
      size: selectedSize || '38',
      img: activeImage || 'assets/placeholder.jpg',
      category: product.category,
      qty: qty
    })
    showToast('success', 'Added to Bag 🛍️', `${product.name} (Size ${selectedSize}) has been added.`)
  }

  const handleWishlistClick = () => {
    const added = toggleItem(product.id)
    if (added) {
      showToast('success', 'Added to Wishlist ❤️', `${product.name} saved.`)
    } else {
      showToast('info', 'Removed from Wishlist', `${product.name} removed.`)
    }
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewName.trim() || !reviewTitle.trim() || !reviewBody.trim()) {
      showToast('error', 'Incomplete Form', 'Please complete all review fields.')
      return
    }

    setSubmittingReview(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          rating: reviewRating,
          title: reviewTitle,
          body: reviewBody,
          name: reviewName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Review Submitted 🎉', 'Thank you! Your review is pending moderation.')
        setReviewName('')
        setReviewTitle('')
        setReviewBody('')
        setReviewRating(5)
      } else {
        showToast('error', 'Submission Failed', data.error || 'Please try again.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not post your review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-screen relative select-none">
      {/* Product Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-7 flex flex-col md:flex-row gap-4">
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex md:flex-col gap-2 order-2 md:order-1 overflow-x-auto md:overflow-x-visible">
              {images.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(imgUrl)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border bg-gray-50 flex-shrink-0 transition-colors ${
                    activeImage === imgUrl ? 'border-primary ring-1 ring-primary' : 'border-gray-200'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Main Image */}
          <div className="flex-1 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 aspect-square order-1 md:order-2 relative shadow-sm">
            <img src={activeImage || 'assets/placeholder.jpg'} alt={product.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Right: Info */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] bg-[#ead2ae] text-gray-800 font-bold uppercase tracking-widest px-2.5 py-1 rounded-full capitalize">
              {product.category}
            </span>
            <h1 className="text-3xl font-light text-gray-950 font-display italic mt-2.5 leading-tight">{product.name}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SKU: {product.sku}</p>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-4">
            <div className="flex items-center text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(product.rating) ? 'fill-amber-500' : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-600 mt-0.5">{product.rating} &middot; {product.review_count} reviews</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-gray-950">
              ₹{(product.price / 100).toLocaleString('en-IN')}
            </span>
            {originalPrice && originalPrice > product.price && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  ₹{(originalPrice / 100).toLocaleString('en-IN')}
                </span>
                <span className="text-xs bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-md uppercase">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          {/* Size picker */}
          {product.sizes?.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-gray-900">
                <span>Select Size</span>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="text-primary hover:text-primary-dark flex items-center gap-1"
                >
                  <Ruler className="w-3.5 h-3.5" /> Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((size) => {
                  const sizeStock = product.size_stock?.[size] ?? 5
                  const sizeOutOfStock = sizeStock <= 0
                  
                  return (
                    <button
                      key={size}
                      onClick={() => !sizeOutOfStock && setSelectedSize(size)}
                      disabled={sizeOutOfStock}
                      className={`h-10 w-12 text-xs font-bold rounded-lg border flex flex-col items-center justify-center transition-all ${
                        sizeOutOfStock
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                          : selectedSize === size
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{size}</span>
                      {!sizeOutOfStock && sizeStock <= 2 && (
                        <span className={`text-[7px] font-bold ${selectedSize === size ? 'text-white' : 'text-[#d4456b]'}`}>
                          {sizeStock} left
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Qty Selector */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-900">Quantity</span>
            <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-sm">
              <button
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                className="p-2 px-3 text-gray-500 hover:text-gray-900"
              >
                -
              </button>
              <span className="text-xs font-bold w-6 text-center text-gray-800">{qty}</span>
              <button
                onClick={() => setQty((prev) => prev + 1)}
                className="p-2 px-3 text-gray-500 hover:text-gray-900"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                isOutOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-[#b17e3f] text-white hover:shadow-md'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {isOutOfStock ? 'Sold Out' : 'Add to Shopping Bag'}
            </button>
            <button
              onClick={handleWishlistClick}
              className={`p-3.5 border rounded-xl hover:bg-gray-50 transition-colors shadow-sm ${
                inWishlist ? 'border-[#d4456b] text-[#d4456b] bg-rose-50/20' : 'border-gray-200 text-gray-500'
              }`}
              title="Wishlist"
            >
              <Heart className={`w-5 h-5 ${inWishlist ? 'fill-[#d4456b]' : ''}`} />
            </button>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500 font-medium pt-4 bg-[#fcfbf9] border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Free Shipping above ₹799
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" /> 7-Day Easy Exchange Only
            </div>
          </div>
        </div>
      </div>

      {/* Description & Specs */}
      <section className="mt-20 border-t border-gray-100 pt-16">
        <h3 className="text-lg font-semibold text-gray-900 font-display italic mb-6">Product Description</h3>
        <p className="text-xs leading-relaxed text-gray-600 max-w-3xl whitespace-pre-line bg-white border border-gray-50 p-6 rounded-xl shadow-sm">
          {product.description || 'Premium handcrafted footwear featuring superior cushioning and elegant detailing. Perfect for style and all-day comfort.'}
        </p>
      </section>

      {/* Size Guide Modal Overlay */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowSizeGuide(false)} className="absolute inset-0 bg-black/50 cursor-pointer" />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl z-10 relative">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-primary" /> HeelsUp Footwear Size Chart
            </h3>
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-[#f7f5f0] text-gray-700">
                  <th className="p-2 border border-gray-200">Euro Size</th>
                  <th className="p-2 border border-gray-200">UK/India Size</th>
                  <th className="p-2 border border-gray-200">Length (cm)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-gray-200 font-semibold">36</td>
                  <td className="p-2 border border-gray-200">3</td>
                  <td className="p-2 border border-gray-200">22.5</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-2 border border-gray-200 font-semibold">37</td>
                  <td className="p-2 border border-gray-200">4</td>
                  <td className="p-2 border border-gray-200">23.0</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-200 font-semibold">38</td>
                  <td className="p-2 border border-gray-200">5</td>
                  <td className="p-2 border border-gray-200">23.8</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-2 border border-gray-200 font-semibold">39</td>
                  <td className="p-2 border border-gray-200">6</td>
                  <td className="p-2 border border-gray-200">24.5</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-200 font-semibold">40</td>
                  <td className="p-2 border border-gray-200">7</td>
                  <td className="p-2 border border-gray-200">25.1</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-2 border border-gray-200 font-semibold">41</td>
                  <td className="p-2 border border-gray-200">8</td>
                  <td className="p-2 border border-gray-200">25.8</td>
                </tr>
              </tbody>
            </table>
            <button
              onClick={() => setShowSizeGuide(false)}
              className="mt-6 w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* Customer Reviews */}
      <section className="mt-20 border-t border-gray-100 pt-16">
        <h3 className="text-lg font-semibold text-gray-900 font-display italic mb-8 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> Customer Reviews
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Reviews list */}
          <div className="lg:col-span-7 space-y-6">
            {reviews.length === 0 ? (
              <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-gray-500 text-xs">
                No reviews yet. Be the first to share your experience!
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-5 border border-gray-100 bg-white rounded-xl shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{rev.reviewer_name || 'Guest User'}</h4>
                      <p className="text-[9px] text-gray-400 mt-0.5">{new Date(rev.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <h5 className="text-xs font-bold text-gray-800 mt-3">{rev.title}</h5>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{rev.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Add a review form */}
          <div className="lg:col-span-5 border border-gray-100 rounded-xl p-6 bg-[#f7f5f0] shadow-sm self-start">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4">Write a Review</h4>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-primary"
                  placeholder="e.g. Priyal Sharma"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Rating</label>
                <div className="flex items-center gap-1.5 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-500' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Review Title</label>
                <input
                  type="text"
                  required
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-primary"
                  placeholder="e.g. Stunning wedges, very comfortable!"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Review Body</label>
                <textarea
                  required
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:border-primary"
                  placeholder="Tell us what you liked or disliked..."
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Submit Review
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20 border-t border-gray-100 pt-16">
          <h3 className="text-lg font-semibold text-gray-900 font-display italic mb-10 text-center">You May Also Like</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((prod) => (
              <a
                key={prod.id}
                href={`/product?id=${prod.id}`}
                className="group flex flex-col gap-3"
              >
                <div className="relative rounded-xl overflow-hidden bg-gray-50 aspect-square shadow-sm">
                  <img
                    src={prod.images?.[0] || 'assets/placeholder.jpg'}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-800 line-clamp-1">{prod.name}</h4>
                  <span className="text-xs font-bold text-gray-900 mt-1 block">
                    ₹{(prod.price / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
