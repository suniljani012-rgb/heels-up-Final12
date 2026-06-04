import { create } from 'zustand'

export interface User {
  id: number;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'staff' | 'admin';
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Load initial state from LocalStorage
  const savedToken = localStorage.getItem('heelsup_token');
  const savedUser = localStorage.getItem('heelsup_user');

  let initialUser: User | null = null;
  if (savedUser) {
    try {
      initialUser = JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('heelsup_user');
    }
  }

  return {
    token: savedToken,
    user: initialUser,
    isAuthenticated: !!savedToken && !!initialUser,
    login: (token, user) => {
      localStorage.setItem('heelsup_token', token);
      localStorage.setItem('heelsup_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('heelsup_token');
      localStorage.removeItem('heelsup_user');
      set({ token: null, user: null, isAuthenticated: false });
    },
    updateUser: (updatedFields) => {
      set((state) => {
        if (!state.user) return state;
        const newUser = { ...state.user, ...updatedFields };
        localStorage.setItem('heelsup_user', JSON.stringify(newUser));
        return { user: newUser };
      });
    },
  };
});
