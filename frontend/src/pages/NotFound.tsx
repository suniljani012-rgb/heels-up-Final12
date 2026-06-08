import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="relative min-h-[75vh] flex flex-col justify-center items-center px-6 text-center select-none overflow-hidden bg-gradient-to-b from-[#fdfbf7] to-[#f9f6f0]">
      {/* Decorative luxury backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ead2ae]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#d4456b]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-md bg-white/75 backdrop-blur-md border border-gray-100 rounded-2xl p-8 md:p-12 shadow-xl shadow-gray-200/40 flex flex-col items-center">
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-full text-primary mb-6 animate-bounce">
          <Compass className="w-8 h-8" />
        </div>

        <span className="text-[10px] text-primary font-bold uppercase tracking-widest block mb-2">Error 404</span>
        <h1 className="text-3xl font-light text-gray-900 font-display italic leading-tight">Design Not Found</h1>
        
        <p className="text-xs text-gray-500 mt-4 leading-relaxed max-w-sm">
          The premium footwear style or page you are looking for has either stepped out of stock or changed location. Let us guide you back.
        </p>

        <div className="w-full mt-8 space-y-3">
          <Link
            to="/shop"
            className="w-full py-3 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 hover:shadow-lg duration-300"
          >
            Explore Storefront
          </Link>
          
          <Link
            to="/"
            className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}
