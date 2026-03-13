import React from 'react';

/**
 * SkeletonCard — animated shimmer placeholder that mirrors the RestaurantCard shape.
 * Used on the Home page while restaurants are being fetched from the backend.
 */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm animate-pulse">
      {/* Image area */}
      <div className="w-full h-52 bg-slate-100" />
      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Name line */}
        <div className="h-5 bg-slate-100 rounded-xl w-3/4" />
        {/* Cuisine tags */}
        <div className="flex gap-2">
          <div className="h-4 bg-slate-100 rounded-full w-16" />
          <div className="h-4 bg-slate-100 rounded-full w-20" />
        </div>
        {/* Stats row */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 bg-slate-100 rounded-xl w-24" />
          <div className="h-8 bg-slate-100 rounded-2xl w-28" />
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonGrid — renders N cards in the same 3-column grid layout as the restaurant list.
 */
export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-x-10 md:gap-y-12">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
