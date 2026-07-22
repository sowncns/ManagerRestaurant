import { api } from './api'
import type { Staff } from '../types/auth'

interface AuthResponse {
  message: string
  staff: Staff
  accessToken?: string
  refreshToken?: string
}

export const authApi = {
  async login(username: string, password: string): Promise<Staff> {
    const { data } = await api.post<AuthResponse>('/internal/auth/login', {
      username,
      password,
    })
    if (data.accessToken) {
      localStorage.setItem('internalAccessToken', data.accessToken)
      localStorage.setItem('internalRefreshToken', data.refreshToken || '')
    }
    return data.staff
  },

  async refresh(): Promise<Staff> {
    const { data } = await api.post<AuthResponse>('/internal/auth/refresh-token')
    return data.staff
  },

  async logout(): Promise<void> {
    try {
      await api.post('/internal/auth/logout')
    } catch (e) {
      console.error(e)
    }
    localStorage.removeItem('internalAccessToken')
    localStorage.removeItem('internalRefreshToken')
  },
}
