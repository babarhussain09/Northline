import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
  const token = response.data?.data?.accessToken as string | undefined;
  return token ?? null;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const url = original?.url ?? '';
    const skip = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register');
    if (error.response?.status === 401 && original && !original._retry && !skip) {
      original._retry = true;
      refreshing ??= refreshAccessToken()
        .catch(() => null)
        .finally(() => {
          refreshing = null;
        });
      const token = await refreshing;
      if (token) {
        setAccessToken(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      setAccessToken(null);
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown, fallback = 'Something went wrong') {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function unwrap<T>(promise: Promise<{ data: { data: T } }>) {
  const response = await promise;
  return response.data.data;
}
