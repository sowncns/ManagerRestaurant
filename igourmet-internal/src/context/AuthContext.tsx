import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../lib/authApi'
import { setUnauthorizedHandler } from '../lib/api'
import type { Staff } from '../types/auth'

type Status = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  staff: Staff | null
  status: Status
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setStaff(null)
      setStatus('unauthenticated')
    })
  }, [])

  useEffect(() => {
    authApi
      .refresh()
      .then((restoredStaff) => {
        setStaff(restoredStaff)
        setStatus('authenticated')
      })
      .catch(() => {
        setStatus('unauthenticated')
      })
  }, [])

  async function login(username: string, password: string) {
    const loggedInStaff = await authApi.login(username, password)
    setStaff(loggedInStaff)
    setStatus('authenticated')
  }

  async function logout() {
    await authApi.logout()
    setStaff(null)
    setStatus('unauthenticated')
  }

  return (
    <AuthContext.Provider value={{ staff, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
