import { create } from 'zustand';
import API from '../api/axios';

export const useOrderStore = create((set, get) => ({
    orders: [],
    loading: false,
    error: null,

    fetchOrders: async (params = {}) => {
        set({ loading: true, error: null });
        try {
            const response = await API.get('/orders/history', { params });
            set({ orders: response.data.data, loading: false });
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to fetch orders';
            set({ error: message, loading: false });
        }
    },


    addOrder: async (orderData) => {
        set({ loading: true, error: null });
        try {
            const response = await API.post('/orders/create', orderData);
            const newOrder = response.data.data;
            set({ orders: [newOrder, ...get().orders], loading: false });
            return newOrder;
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to place order';
            set({ error: message, loading: false });
            throw new Error(message);
        }
    },

    getOrderById: async (orderId) => {
        try {
            const response = await API.get(`/orders/${orderId}`);
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch order:', error);
            return null;
        }
    },

    updateStatus: async (orderId, status) => {
        try {
            const response = await API.put(`/orders/${orderId}/status`, { status });
            const updatedOrder = response.data.data;
            set({
                orders: get().orders.map(o => o._id === orderId ? updatedOrder : o)
            });
            return updatedOrder;
        } catch (error) {
            console.error('Failed to update status:', error);
            throw error;
        }
    },

    acceptOrder: async (orderId) => {
        try {
            const response = await API.post(`/orders/${orderId}/accept`);
            const updatedOrder = response.data.data;
            set({
                orders: get().orders.map(o => o._id === orderId ? updatedOrder : o)
            });
            return updatedOrder;
        } catch (error) {
            console.error('Failed to accept order:', error);
            throw error;
        }
    }
}));


