// frontend/src/components/Skeletons.tsx
import React from 'react'

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl p-2 bg-white/50 border border-gray-100/60 animate-pulse">
      <div className="w-full aspect-square bg-neutral-200/70 rounded-xl" />
      <div className="flex flex-col gap-2 p-1">
        <div className="h-2.5 bg-neutral-200/80 rounded w-1/3" />
        <div className="h-4 bg-neutral-200/80 rounded w-3/4" />
        <div className="h-3 bg-neutral-200/80 rounded w-1/2 mt-1" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-72 rounded-xl bg-neutral-200/70 w-full" />
      ))}
    </div>
  )
}

export function BannerSkeleton() {
  return (
    <div className="w-full h-[70vh] md:h-[80vh] bg-neutral-200/80 animate-pulse flex items-center justify-center">
      <div className="max-w-xl text-center space-y-4 px-6">
        <div className="h-4 bg-neutral-300 rounded w-1/3 mx-auto" />
        <div className="h-10 bg-neutral-300 rounded w-3/4 mx-auto" />
        <div className="h-4 bg-neutral-300 rounded w-1/2 mx-auto" />
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
      <div className="space-y-4">
        <div className="w-full aspect-square bg-neutral-200 rounded-2xl" />
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-20 h-20 bg-neutral-200 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-6 flex flex-col justify-center">
        <div className="h-4 bg-neutral-200 rounded w-1/4" />
        <div className="h-8 bg-neutral-200 rounded w-3/4" />
        <div className="h-6 bg-neutral-200 rounded w-1/3" />
        <div className="h-20 bg-neutral-200 rounded w-full" />
        <div className="h-12 bg-neutral-200 rounded-xl w-full" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-10 bg-neutral-200/80 rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-neutral-100 rounded-lg w-full" />
      ))}
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="w-full py-8 space-y-3 animate-pulse max-w-xl">
      <div className="h-3 bg-neutral-200 rounded w-1/4" />
      <div className="h-8 bg-neutral-200 rounded w-2/3" />
    </div>
  )
}
