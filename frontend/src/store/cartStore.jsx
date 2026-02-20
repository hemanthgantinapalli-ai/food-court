import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      discount: 0,
      addToCart: (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item._id === product._id);

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
            ),
          });
        } else {
          set({ items: [...currentItems, { ...product, quantity: 1 }] });
        }
      },
      removeFromCart: (id) => {
        const newItems = get().items.filter((i) => i._id !== id);
        set({ items: newItems });
        if (newItems.length === 0) set({ coupon: null, discount: 0 });
      },
      clearCart: () => set({ items: [], coupon: null, discount: 0 }),
      getTotal: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
      applyCoupon: (code) => {
        const subtotal = get().getTotal();
        if (code === 'FOODCOURT10') {
          set({ coupon: code, discount: subtotal * 0.1 });
          return { success: true, message: '10% discount applied!' };
        }
        if (code === 'WELCOME20') {
          set({ coupon: code, discount: subtotal * 0.2 });
          return { success: true, message: '20% discount applied!' };
        }
        return { success: false, message: 'Invalid coupon code' };
      },
    }),
    { name: 'foodcourt-storage' }
  )
);