// ════════════════════════════════════════════════════════════
//  EXPO / REACT NATIVE — API CLIENT SETUP
//  Place these files in your Expo project
// ════════════════════════════════════════════════════════════

// ─── lib/api.ts ─────────────────────────────────────────────
// Install: npx expo install expo-secure-store
//          npm install axios

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Development: use your local IP (not localhost — emulator can't reach it)
// Production: your deployed API URL
const BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000/api/v1'   // ← replace with YOUR local IP
  : 'https://api.budgetwise.app/api/v1';  // ← your production domain

const KEYS = {
  ACCESS_TOKEN: 'bw_access_token',
  REFRESH_TOKEN: 'bw_refresh_token',
};

// ─── Token Storage ──────────────────────────────────────────
export const tokenStorage = {
  async getAccess(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },
  async getRefresh(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },
  async save(access: string, refresh: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh),
    ]);
  },
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    ]);
  },
};

// ─── Axios Instance ─────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefresh();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;

        await tokenStorage.save(accessToken, newRefresh);
        processQueue(null, accessToken);

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        await tokenStorage.clear();
        // Navigate to login — use your navigation method here
        // router.replace('/login');
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Auth API calls ──────────────────────────────────────────

export const authApi = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const res = await api.post('/auth/register', data);
    const { user, accessToken, refreshToken } = res.data.data;
    await tokenStorage.save(accessToken, refreshToken);
    return user;
  },

  async login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = res.data.data;
    await tokenStorage.save(accessToken, refreshToken);
    return user;
  },

  async logout() {
    const refreshToken = await tokenStorage.getRefresh();
    await api.post('/auth/logout', { refreshToken });
    await tokenStorage.clear();
  },

  async me() {
    const res = await api.get('/auth/me');
    return res.data.data;
  },
};

// ─── Transactions API ────────────────────────────────────────

export const transactionsApi = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    type?: 'INCOME' | 'EXPENSE';
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const res = await api.get('/transactions', { params });
    return res.data; // { data, meta }
  },

  async getDashboard() {
    const res = await api.get('/transactions/dashboard');
    return res.data.data;
  },

  async create(data: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    date: string; // YYYY-MM-DD
    categoryId?: string;
    note?: string;
  }) {
    const res = await api.post('/transactions', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<Parameters<typeof transactionsApi.create>[0]>) {
    const res = await api.patch(`/transactions/${id}`, data);
    return res.data.data;
  },

  async delete(id: string) {
    await api.delete(`/transactions/${id}`);
  },
};

// ─── Goals API ───────────────────────────────────────────────

export const goalsApi = {
  async getAll(status?: string) {
    const res = await api.get('/goals', { params: { status } });
    return res.data.data;
  },
  async create(data: any) {
    const res = await api.post('/goals', data);
    return res.data.data;
  },
  async contribute(id: string, amount: number) {
    const res = await api.post(`/goals/${id}/contribute`, { amount });
    return res.data.data;
  },
};

// ─── AI Chat API ─────────────────────────────────────────────

export const aiChatApi = {
  async getHistory() {
    const res = await api.get('/ai-chat/history');
    return res.data.data;
  },
  async sendMessage(message: string) {
    const res = await api.post('/ai-chat/message', { message });
    return res.data.data;
  },
};
