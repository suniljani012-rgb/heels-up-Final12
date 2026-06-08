import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

export default function DynamicPage() {
  const location = useLocation()
  const [pageData, setPageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const rawPath = location.pathname.replace(/^\//, '').replace(/\.html$/, '')
  let slug = rawPath
  if (rawPath === 'privacy' || rawPath === 'privacy-policy') slug = 'privacy-policy'
  if (rawPath === 'terms' || rawPath === 'terms-and-conditions' || rawPath === 'terms-conditions') slug = 'terms-and-conditions'
  if (rawPath === 'shipping' || rawPath === 'shipping-info') slug = 'shipping-info'
  if (rawPath === 'size' || rawPath === 'size-guide') slug = 'size-guide'

  useEffect(() => {
    const cached = localStorage.getItem('heelsup_cached_page_' + slug)
    let hasCached = false
    if (cached) {
      try {
        setPageData(JSON.parse(cached))
        setLoading(false)
        hasCached = true
      } catch {}
    }
    
    if (!hasCached) {
      setLoading(true)
    }
    setErrorMsg('')

    async function fetchPage() {
      try {
        const res = await fetch(`/api/pages/${slug}`)
        const data = await res.json()
        if (data.success && data.data) {
          setPageData(data.data)
          localStorage.setItem('heelsup_cached_page_' + slug, JSON.stringify(data.data))
        } else {
          setErrorMsg(data.error || 'This policy page does not exist.')
        }
      } catch {
        setErrorMsg('Failed to synchronize connection with the database. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchPage()
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center justify-center min-h-[50vh] select-none">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-gray-400 mt-4 tracking-widest uppercase">Synchronizing Documents...</p>
      </div>
    )
  }

  if (errorMsg || !pageData) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 flex flex-col items-center justify-center min-h-[50vh] text-center select-none">
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-full text-[#d4456b] mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 font-display italic">Document Not Found</h2>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{errorMsg || 'The requested administrative file could not be fetched.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 mt-6 px-6 py-2.5 bg-gray-950 text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 mt-16 min-h-screen">
      {/* Header breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest select-none">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span>&middot;</span>
        <span className="text-gray-900 capitalize">{pageData.title}</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-light text-gray-900 mt-4 mb-8 font-display italic">
        {pageData.title}
      </h1>

      <div className="border border-gray-100 bg-white rounded-2xl p-6 md:p-10 shadow-sm">
        {/* Dynamic HTML Content */}
        <div
          className="prose prose-sm max-w-none text-gray-600 leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: pageData.content }}
        />
      </div>

      <div className="mt-8 border-t border-gray-100 pt-6 text-center select-none">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Storefront
        </Link>
      </div>
    </div>
  )
}
