import { create } from 'zustand';
import API from '../api/axios.js';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  signUp: async (formData) => {
    set({ loading: true, error: null });
    try {
      const response = await API.post('/auth/register', formData);
      const token = response.data.token || response.data.data?.token;
      const user = response.data.user || response.data.data?.user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, loading: false });
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Sign up failed';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  signIn: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await API.post('/auth/login', credentials);
      const token = response.data.token || response.data.data?.token;
      const user = response.data.user || response.data.data?.user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, loading: false });
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Sign in failed';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  getProfile: async () => {
    try {
      const response = await API.get('/auth/profile');
      set({ user: response.data.data });
      localStorage.setItem('user', JSON.stringify(response.data.data));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateProfile: async (updates) => {
    try {
      const response = await API.put('/auth/profile', updates);
      set({ user: response.data.data });
      localStorage.setItem('user', JSON.stringify(response.data.data));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  isAuthenticated: () => !!localStorage.getItem('token'),
}));
