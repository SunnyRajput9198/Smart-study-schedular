// apps/frontend/src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

// Define the shape of the user object
interface User {
  id: number;
  username: string;
}

// Define the shape of the decoded token
interface DecodedToken {
  sub: string; // This is the username
  user_id: number; // We will add this to the token in the backend
  exp: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  setToken: (token: string | null) => void;
  activesessions: number; // Added this line
  logout: () => void;
  clearToken: () => void; // Added this method
  setactivesessions: (count: number) => void; // Added this line
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoggedIn: false,
      activesessions: 0, // Added this line
      setactivesessions: (count: number) => set({ activesessions: count }), // Added this line  
      setToken: (token) => {
        if (token) {
          try {
            console.log('🔍 Decoding token:', token.substring(0, 30) + '...');
            const decoded = jwtDecode<DecodedToken>(token);
            console.log('✅ Decoded token:', decoded);
            
            // Check if token is expired
            const now = Date.now() / 1000;
            if (decoded.exp < now) {
              console.log('❌ Token is expired');
              set({ token: null, user: null, isLoggedIn: false });
              return;
            }
            
            set({
              token,
              isLoggedIn: true,
              user: {
                id: decoded.user_id,
                username: decoded.sub,
              },
            });
            console.log('✅ Token and user saved to store');
          } catch (error) {
            console.error("❌ Failed to decode token:", error);
            // If token is invalid, log out
            set({ token: null, user: null, isLoggedIn: false });
          }
        } else {
          // If no token, log out
          set({ token: null, user: null, isLoggedIn: false });
        }
      },
      logout: () => {
        console.log('🚪 Logging out user');
        set({ token: null, user: null, isLoggedIn: false });
      },
      clearToken: () => {
        console.log('🧹 Clearing token');
        set({ token: null, user: null, isLoggedIn: false });
      },
    }),
    {
      name: 'auth-storage',
      // Add version for migration if needed
      version: 1,
    }
  )
);

export default useAuthStore;