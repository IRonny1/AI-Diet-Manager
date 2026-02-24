import { create } from 'zustand';
import { User } from '@/types/auth.types';
import authApiService from '@/services/api/auth.api';
import storageService from '@/services/storage/storage.service';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authApiService.login({ email, password });

      // Save tokens and user data to storage
      await storageService.saveTokens(
        response.accessToken,
        response.refreshToken
      );
      await storageService.saveUser(response.user);

      set({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Login failed. Please try again.';
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authApiService.register({ email, password });

      // Save tokens and user data to storage
      await storageService.saveTokens(
        response.accessToken,
        response.refreshToken
      );
      await storageService.saveUser(response.user);

      set({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        'Registration failed. Please try again.';
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await storageService.clearAll();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  refreshAccessToken: async () => {
    try {
      const { refreshToken } = get();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authApiService.refreshToken(refreshToken);

      // Save new access token
      await storageService.saveTokens(
        response.accessToken,
        response.refreshToken
      );

      set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout user
      await get().logout();
      throw error;
    }
  },

  loadStoredAuth: async () => {
    try {
      set({ isLoading: true });

      const [accessToken, refreshToken, user] = await Promise.all([
        storageService.getAccessToken(),
        storageService.getRefreshToken(),
        storageService.getUser(),
      ]);

      if (accessToken && refreshToken && user) {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  setError: (error: string | null) => set({ error }),
  
  clearError: () => set({ error: null }),
}));
