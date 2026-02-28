import { create } from 'zustand';
import API from '../api/axios';

const getInitialUser = () => {
  try {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    localStorage.removeItem('user');
    return null;
  }
};

export const useAuthStore = create((set, get) => ({
  user: getInitialUser(),
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  getProfile: async () => {
    if (!get().token) return null;
    try {
      const response = await API.get('/auth/profile');
      const user = response.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
      return user;
    } catch (error) {
      if (error.response?.status === 401) {
        get().logout();
      }
      return null;
    }
  },

  signUp: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await API.post('/auth/register', userData);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, token, loading: false });
      return user;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  signIn: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await API.post('/auth/login', credentials);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, token, loading: false });
      return user;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  updateProfile: async (updates) => {
    set({ loading: true, error: null });
    try {
      const response = await API.put('/auth/profile', updates);
      const updatedUser = response.data.user;

      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser, loading: false });
      return updatedUser;
    } catch (error) {
      const message = error.response?.data?.message || 'Update failed';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },
}));

