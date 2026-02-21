import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOrderStore = create(
    persist(
        (set, get) => ({
            orders: [],
            addOrder: (order) => {
                set({ orders: [order, ...get().orders] });
            },
            getUserOrders: (userId) => {
                if (!userId) return [];
                const uId = String(userId);
                return get().orders.filter(order => String(order.userId) === uId);
            }
        }),
        { name: 'foodcourt-orders' }
    )
);
