import React from 'react';
import { ShoppingBag, X, AlertTriangle } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function CartConflictModal() {
    const { conflictItem, confirmClearAndAdd, cancelConflict } = useCartStore();

    if (!conflictItem) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
                onClick={cancelConflict}
            />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 animate-zoom-in">
                <button
                    onClick={cancelConflict}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                        <AlertTriangle className="text-orange-600" size={36} />
                    </div>

                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Replace Cart?</h3>

                    <p className="text-slate-500 font-medium leading-relaxed mb-10">
                        You already have items from another restaurant in your cart. <br />
                        <span className="text-slate-900 font-bold">Discard old items</span> and add <span className="text-orange-600 font-black italic">"{conflictItem.name}"</span>?
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        <button
                            onClick={confirmClearAndAdd}
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all transform active:scale-95"
                        >
                            Discard and Add
                        </button>
                        <button
                            onClick={cancelConflict}
                            className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all"
                        >
                            Keep Existing Cart
                        </button>
                    </div>
                </div>

                {/* Floating decoration */}
                <div className="absolute -bottom-4 -left-4 opacity-10">
                    <ShoppingBag size={120} className="text-slate-900 -rotate-12" />
                </div>
            </div>
        </div>
    );
}
