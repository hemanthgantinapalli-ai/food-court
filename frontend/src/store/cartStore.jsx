import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      coupon: null,
      discount: 0,
      addToCart: (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item._id === product._id);
        // Track restaurantId from the first item added
        const restaurantId = product.restaurant?._id || product.restaurant || get().restaurantId;
        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
            ),
            restaurantId,
          });
        } else {
          set({ items: [...currentItems, { ...product, quantity: 1 }], restaurantId });
        }
      },
      updateQuantity: (id, quantity) => {
        const currentItems = get().items;
        if (quantity < 1) {
          get().removeFromCart(id);
        } else {
          set({
            items: currentItems.map((item) =>
              item._id === id ? { ...item, quantity } : item
            ),
          });
        }
      },
      removeFromCart: (id) => {
        const newItems = get().items.filter((i) => i._id !== id);
        set({ items: newItems });
        if (newItems.length === 0) set({ coupon: null, discount: 0, restaurantId: null });
      },
      clearCart: () => set({ items: [], coupon: null, discount: 0, restaurantId: null }),
      getTotal: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
      getRestaurantId: () => get().restaurantId,
      applyCoupon: (code) => {
        const subtotal = get().getTotal();
        if (code === 'FIRST50') {
          set({ coupon: code, discount: Math.min(subtotal * 0.5, 150) });
          return { success: true, message: '50% discount up to ₹150 applied!' };
        }
        if (code === 'PIZZA40') {
          if (subtotal >= 299) {
            set({ coupon: code, discount: Math.min(subtotal * 0.4, 120) });
            return { success: true, message: '40% discount for Pizza applied!' };
          }
          return { success: false, message: 'Order min ₹299 for this code' };
        }
        if (code === 'FREEDEL') {
          set({ coupon: code, discount: 49 }); // Assuming ₹49 is the delivery fee
          return { success: true, message: 'Free delivery applied! (₹49 saved)' };
        }
        if (code === 'WEEKEND30') {
          const day = new Date().getDay();
          if (day === 0 || day === 6) {
            set({ coupon: code, discount: Math.min(subtotal * 0.3, 200) });
            return { success: true, message: '30% weekend discount applied!' };
          }
          return { success: false, message: 'Code only valid on Sat & Sun' };
        }
        if (code === 'SUSHI25') {
          if (subtotal >= 399) {
            set({ coupon: code, discount: subtotal * 0.25 });
            return { success: true, message: '25% Sushi discount applied!' };
          }
          return { success: false, message: 'Order min ₹399 for this code' };
        }
        if (code === 'COMBO199') {
          // Simplified for demo: just gives a flat discount if items exist
          set({ coupon: code, discount: 50 });
          return { success: true, message: 'Combo discount applied!' };
        }

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