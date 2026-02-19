import { create } from "zustand";
import axios from "../api/axios";

export const useAuth = create((set) => ({
  user: null,
  token: localStorage.getItem("token"),

  login: async (data) => {
    const res = await axios.post("/auth/login", data);
    localStorage.setItem("token", res.data.token);
    set({ user: res.data.user, token: res.data.token });
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, token: null });
  },
}));
