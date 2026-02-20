import React from 'react';

export default function Loader_Component({ message = 'Preparing your feast...' }) {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center z-[100]">
      <div className="relative flex items-center justify-center">
        
        {/* Outer Pulsing Glow */}
        <div className="absolute w-32 h-32 bg-orange-500/10 rounded-full animate-ping duration-[2000ms]"></div>
        
        {/* Main Animated Circle */}
        <div className="relative w-24 h-24">
          <div className="w-full h-full border-[3px] border-slate-100 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-t-[3px] border-orange-500 rounded-full animate-spin duration-700"></div>
          
          {/* Inner Icon/Dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-gradient-to-tr from-orange-500 to-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
          </div>
        </div>
      </div>

      {/* Text Elements */}
      <div className="mt-12 text-center">
        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
          Food<span className="text-orange-500">Court</span>
        </h3>
        <div className="flex flex-col items-center gap-1 mt-2">
          <p className="text-slate-500 text-sm font-bold tracking-tight">
            {message}
          </p>
          {/* Animated loading bars */}
          <div className="flex gap-1 mt-4">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
          </div>
        </div>
      </div>
    </div>
  );
}