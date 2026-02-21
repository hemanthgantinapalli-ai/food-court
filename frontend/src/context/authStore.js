import { create } from 'zustand';

// ─── Local-storage helpers ───────────────────────────────────────────────────
const USERS_KEY = 'fc_users_db';
const SESSION_KEY = 'fc_session';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
  catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}
function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAuthStore = create((set) => ({
  user: getSession(),
  loading: false,
  error: null,

  signUp: async ({ name, email, password }) => {
    set({ loading: true, error: null });
    await new Promise((r) => setTimeout(r, 700)); // simulate network
    const users = getUsers();
    if (users.find((u) => u.email === email)) {
      set({ loading: false, error: 'Email already registered' });
      throw new Error('Email already registered');
    }
    const newUser = { id: Date.now(), name, email, password, createdAt: new Date().toISOString() };
    saveUsers([...users, newUser]);
    const { password: _, ...safeUser } = newUser;
    saveSession(safeUser);
    set({ user: safeUser, loading: false });
    return safeUser;
  },

  signIn: async ({ email, password, role }) => {
    set({ loading: true, error: null });
    await new Promise((r) => setTimeout(r, 700));

    // Hardcoded Admin Login
    if (email === 'admin@foodcourt.com' && password === 'admin123') {
      const adminUser = { id: 'admin1', name: 'System Admin', email, role: 'admin' };
      saveSession(adminUser);
      set({ user: adminUser, loading: false });
      return adminUser;
    }

    // Hardcoded Rider Login
    if (email === 'rider@foodcourt.com' && password === 'rider123') {
      const riderUser = { id: 'rider1', name: 'Fast Rider', email, role: 'rider' };
      saveSession(riderUser);
      set({ user: riderUser, loading: false });
      return riderUser;
    }

    const users = getUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) {
      set({ loading: false, error: 'Invalid email or password' });
      throw new Error('Invalid email or password');
    }
    const { password: _, ...safeUser } = found;
    // ensure user always has a default role if none
    safeUser.role = safeUser.role || 'user';
    saveSession(safeUser);
    set({ user: safeUser, loading: false });
    return safeUser;
  },

  logout: () => {
    clearSession();
    set({ user: null });
  },

  updateProfile: async (updates) => {
    const session = getSession();
    if (!session) throw new Error('Not logged in');
    const users = getUsers();
    const updated = users.map((u) => u.id === session.id ? { ...u, ...updates } : u);
    saveUsers(updated);
    const newSession = { ...session, ...updates };
    saveSession(newSession);
    set({ user: newSession });
    return newSession;
  },

  isAuthenticated: () => !!getSession(),
}));
