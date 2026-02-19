import { create } from 'zustand';
import API from '../api/axios.js';

export const useCartStore = create((set, get) => ({
  cart: null,
  loading: false,

  getCart: async () => {
    try {
      const response = await API.get('/cart');
      set({ cart: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  },

  addToCart: async (restaurantId, menuItemId, quantity, addOns = []) => {
    set({ loading: true });
    try {
      const response = await API.post('/cart/add', {
        restaurantId,
        menuItemId,
        quantity,
        addOns,
      });
      set({ cart: response.data.data, loading: false });
      return response.data;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  updateCart: async (menuItemId, quantity) => {
    set({ loading: true });
    try {
      const response = await API.put('/cart/update', {
        menuItemId,
        quantity,
      });
      set({ cart: response.data.data, loading: false });
      return response.data;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  removeFromCart: async (menuItemId) => {
    set({ loading: true });
    try {
      const response = await API.delete(`/cart/${menuItemId}`);
      set({ cart: response.data.data, loading: false });
      return response.data;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  clearCart: async () => {
    set({ loading: true });
    try {
      await API.delete('/cart');
      set({ cart: null, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  applyCoupon: async (couponCode) => {
    try {
      const response = await API.post('/cart/coupon', { couponCode });
      set({ cart: response.data.data });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCartItemCount: () => {
    const { cart } = get();
    return cart?.items?.length || 0;
  },
}));
