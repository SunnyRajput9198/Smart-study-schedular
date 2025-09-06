import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the shape of the user object
interface User {
  username: string;
}

// Define the interface for the store's state and actions
interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoggedIn: false,
      setToken: (token) => {
        set({ token, isLoggedIn: !!token });
        // In a real app, you'd decode the JWT or fetch user data here
        if (token) {
          // Placeholder user data
          set({ user: { username: 'user' } }); 
        } else {
          set({ user: null });
        }
      },
      logout: () => set({ token: null, user: null, isLoggedIn: false }),
    }),
    {
      name: 'auth-storage', // name of the item in localStorage
    }
  )
);

export default useAuthStore;