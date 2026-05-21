import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// ─── Base URL 
// Avtomatsko zaznavanje lokalnega IP naslova računalnika med razvojem
const getDevApiUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri || '';
  const ipAddress = debuggerHost.split(':').shift();
  // Če uspešno zazna IP računalnika, uporabi tega, drugače vrne privzeti localhost
  return ipAddress ? `http://${ipAddress}:3000/api/v1` : 'http://localhost:3000/api/v1';
};

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? getDevApiUrl() : 'https://api.budgetwise.app/api/v1');

console.log('🔌 BudgetWise se povezuje na API:', BASE_URL);

// ─── Secure Storage Keys 
const KEYS = {
  ACCESS_TOKEN: 'bw_access_token',
  REFRESH_TOKEN: 'bw_refresh_token',
} as const;

// ─── Token Storage 
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

// ─── Axios Instance 
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: inject access token 
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: transparent token refresh 
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Queue concurrent 401s while a refresh is in-flight
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
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

      // Use a plain axios call to avoid interceptor loops
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = data.data;

      await tokenStorage.save(accessToken, newRefresh);
      processQueue(null, accessToken);

      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await tokenStorage.clear();
      // The AuthContext useEffect / logout flow handles navigation
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Resource API helpers


// ── Auth 
export const authApi = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    currency?: string;
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
    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      await tokenStorage.clear();
    }
  },

  async me() {
    const res = await api.get('/auth/me');
    return res.data.data;
  },
};

// ── Transactions 
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
    date: string;
    categoryId?: string;
    note?: string;
  }) {
    const res = await api.post('/transactions', data);
    return res.data.data;
  },

  async update(id: string, data: Record<string, unknown>) {
    const res = await api.patch(`/transactions/${id}`, data);
    return res.data.data;
  },

  async delete(id: string) {
    await api.delete(`/transactions/${id}`);
  },
};

// ── Goals 
export const goalsApi = {
  async getAll(status?: string) {
    const res = await api.get('/goals', { params: { status } });
    return res.data.data;
  },
  async create(data: {
    name: string;
    targetAmount: number;
    targetDate?: string;
    description?: string;
  }) {
    const res = await api.post('/goals', data);
    return res.data.data;
  },
  async contribute(id: string, amount: number) {
    const res = await api.post(`/goals/${id}/contribute`, { amount });
    return res.data.data;
  },
};

// ── AI Chat 
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

// ── Reports 
export const reportsApi = {
  async getMonthly(year: number, month: number) {
    const res = await api.get('/reports/monthly', { params: { year, month } });
    return res.data.data;
  },
};

// ── Categories 
export const categoriesApi = {
  async getAll() {
    const res = await api.get('/categories');
    return res.data.data;
  },
};