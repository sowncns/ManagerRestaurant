import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
})

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

let refreshPromise: Promise<unknown> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isRefreshCall = originalRequest?.url?.includes('/internal/auth/refresh-token')
    const isLoginCall = originalRequest?.url?.includes('/internal/auth/login')

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshCall &&
      !isLoginCall
    ) {
      originalRequest._retry = true
      try {
        refreshPromise ??= api.post('/internal/auth/refresh-token')
        await refreshPromise
        refreshPromise = null
        return api(originalRequest)
      } catch (refreshError) {
        refreshPromise = null
        onUnauthorized?.()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)
