import { User, PlatformAccount, Transaction, OverallSummary, PlatformSummary, DateRange } from '../types';
import { syncService } from './backgroundSync';

const TOKEN_KEY = 'rw_access_token';
const REFRESH_KEY = 'rw_refresh_token';
const USER_KEY = 'rw_user_data';
const CACHE_PREFIX = 'rw_cache_';

export const ApiClient = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setAuth(tokens: { accessToken: string; refreshToken?: string; user: User }) {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
  },

  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },

  setCache(key: string, data: any) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.warn('Cache write failed', e);
    }
  },

  getCache<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(endpoint, { ...options, headers });
      if (res.status === 401) {
        // Token expired - attempt refresh if possible, otherwise clear
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (refreshToken && !endpoint.includes('/auth/refresh')) {
          try {
            const refreshRes = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const data = await refreshRes.json();
            if (data.success && data.accessToken) {
              localStorage.setItem(TOKEN_KEY, data.accessToken);
              headers['Authorization'] = `Bearer ${data.accessToken}`;
              const retryRes = await fetch(endpoint, { ...options, headers });
              return await retryRes.json();
            }
          } catch (e) {
            this.clearAuth();
          }
        }
      }

      const data = await res.json();
      return data;
    } catch (networkError) {
      // If network fails (e.g. rider is offline in basement or weak signal), retrieve cached data
      console.warn(`[Network Offline] Request to ${endpoint} failed, falling back to cache.`);
      const cached = this.getCache<T>(endpoint);
      if (cached) {
        return cached;
      }
      throw networkError;
    }
  },

  // Auth
  async signup(payload: { name: string; phone: string; password: string; language?: string }) {
    const res = await this.request<any>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success) {
      this.setAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
    }
    return res;
  },

  async login(payload: { phone: string; password: string }) {
    const res = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success) {
      this.setAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user });
    }
    return res;
  },

  async getMe() {
    const res = await this.request<{ success: boolean; user: User }>('/api/auth/me');
    if (res?.success && res.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    }
    return res;
  },

  async updateProfile(updates: { name?: string; language?: 'en' | 'hi' }) {
    const res = await this.request<{ success: boolean; user: User }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (res.success) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    }
    return res;
  },

  // Platforms
  async getPlatforms(range: DateRange = 'today'): Promise<{ success: boolean; platforms: PlatformAccount[] }> {
    const cacheKey = `/api/platforms?range=${range}`;
    const res = await this.request<{ success: boolean; platforms: PlatformAccount[] }>(cacheKey);
    if (res?.success) {
      this.setCache(cacheKey, res);
    }
    return res;
  },

  async addPlatform(payload: { platformName: string; colorTheme: string; icon?: string }) {
    return await this.request<{ success: boolean; platform: PlatformAccount }>('/api/platforms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updatePlatform(id: string, updates: Partial<PlatformAccount>) {
    return await this.request<{ success: boolean; platform: PlatformAccount }>(`/api/platforms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deletePlatform(id: string) {
    return await this.request<{ success: boolean; message: string }>(`/api/platforms/${id}`, {
      method: 'DELETE',
    });
  },

  // Platform Dashboard details
  async getPlatformSummary(id: string, range: DateRange = 'today') {
    const cacheKey = `/api/platforms/${id}/summary?range=${range}`;
    const res = await this.request<{
      success: boolean;
      platform: { id: string; platformName: string; colorTheme: string; icon: string };
      summary: PlatformSummary;
    }>(cacheKey);
    if (res?.success) {
      this.setCache(cacheKey, res);
    }
    return res;
  },

  async getPlatformTransactions(id: string, range: DateRange = 'all') {
    const cacheKey = `/api/platforms/${id}/transactions?range=${range}`;
    const res = await this.request<{ success: boolean; transactions: Transaction[] }>(cacheKey);
    if (res?.success) {
      this.setCache(cacheKey, res);
    }
    return res;
  },

  async getAllTransactions(range: DateRange = 'all') {
    const cacheKey = `/api/transactions?range=${range}`;
    const res = await this.request<{ success: boolean; transactions: Transaction[] }>(cacheKey);
    if (res?.success) {
      this.setCache(cacheKey, res);
    }
    return res;
  },

  // Transactions
  async createTransaction(payload: {
    platformAccountId: string;
    type: string;
    amount: number;
    note?: string;
    tag?: string;
    date?: string;
    incentiveStatus?: string;
  }): Promise<{ success: boolean; transaction?: Transaction; isOfflineQueued?: boolean }> {
    // If browser is currently offline, queue immediately via Background Sync Service
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[ApiClient] Device is offline, queueing transaction for background sync...');
      const queued = await syncService.queueTransaction(payload, this.getToken());
      return {
        success: true,
        isOfflineQueued: true,
        transaction: {
          id: queued.id,
          platformAccountId: payload.platformAccountId,
          type: payload.type as any,
          amount: payload.amount,
          tag: payload.tag,
          note: payload.note,
          date: payload.date || new Date().toISOString(),
          incentiveStatus: payload.incentiveStatus as any,
        },
      };
    }

    try {
      return await this.request<{ success: boolean; transaction: Transaction }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      // If network request failed unexpectedly (e.g. lost cellular signal mid-request), queue in IndexedDB
      console.warn('[ApiClient] Network POST failed, queueing transaction for background sync:', networkError);
      const queued = await syncService.queueTransaction(payload, this.getToken());
      return {
        success: true,
        isOfflineQueued: true,
        transaction: {
          id: queued.id,
          platformAccountId: payload.platformAccountId,
          type: payload.type as any,
          amount: payload.amount,
          tag: payload.tag,
          note: payload.note,
          date: payload.date || new Date().toISOString(),
          incentiveStatus: payload.incentiveStatus as any,
        },
      };
    }
  },

  async updateIncentiveStatus(transactionId: string, status: 'pending' | 'received') {
    return await this.request<{ success: boolean; transaction: { id: string; incentiveStatus: string } }>(
      `/api/transactions/${transactionId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },

  async deleteTransaction(transactionId: string) {
    return await this.request<{ success: boolean; message: string }>(`/api/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  },

  // Overall Summary
  async getOverallSummary(range: DateRange = 'today') {
    const cacheKey = `/api/summary/overall?range=${range}`;
    const res = await this.request<{ success: boolean; data: OverallSummary }>(cacheKey);
    if (res?.success) {
      this.setCache(cacheKey, res);
    }
    return res;
  },
};
