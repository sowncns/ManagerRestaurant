import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('internalAccessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
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
        const refreshToken = localStorage.getItem('internalRefreshToken')
        refreshPromise ??= api.post('/internal/auth/refresh-token', { refreshToken })
        const res: any = await refreshPromise
        refreshPromise = null
        if (res.data?.accessToken) {
          localStorage.setItem('internalAccessToken', res.data.accessToken)
          if (res.data.refreshToken) {
            localStorage.setItem('internalRefreshToken', res.data.refreshToken)
          }
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`
        }
        return api(originalRequest)
      } catch (refreshError) {
        refreshPromise = null
        localStorage.removeItem('internalAccessToken')
        localStorage.removeItem('internalRefreshToken')
        onUnauthorized?.()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)
