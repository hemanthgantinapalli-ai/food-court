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
                return get().orders.filter(order => order.userId === userId);
            }
        }),
        { name: 'foodcourt-orders' }
    )
);
