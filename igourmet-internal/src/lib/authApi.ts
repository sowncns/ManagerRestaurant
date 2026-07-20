import { api } from './api'
import type { Staff } from '../types/auth'

interface AuthResponse {
  message: string
  staff: Staff
}

export const authApi = {
  async login(username: string, password: string): Promise<Staff> {
    const { data } = await api.post<AuthResponse>('/internal/auth/login', {
      username,
      password,
    })
    return data.staff
  },

  async refresh(): Promise<Staff> {
    const { data } = await api.post<AuthResponse>('/internal/auth/refresh-token')
    return data.staff
  },

  async logout(): Promise<void> {
    await api.post('/internal/auth/logout')
  },
}
