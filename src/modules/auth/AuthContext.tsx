import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { logoutRequest } from './authApi.ts'
import { getJwtToken, getUserRole, removeJwtToken, removeUserRole, setJwtToken, setUserRole } from './storage.ts'

type AuthContextValue = {
  isAuthenticated: boolean
  jwtToken: string | null
  role: string | null
  loginWithToken: (token: string, role: string) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [jwtToken, setJwtTokenState] = useState<string | null>(() => getJwtToken())
  const [role, setRoleState] = useState<string | null>(() => getUserRole())

  const loginWithToken = useCallback((token: string, userRole: string) => {
    setJwtToken(token)
    setUserRole(userRole)
    setJwtTokenState(token)
    setRoleState(userRole)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (getJwtToken()) {
        await logoutRequest()
      }
    } catch {
      // Even if the backend is unreachable, clear the local session.
    } finally {
      removeJwtToken()
      removeUserRole()
      setJwtTokenState(null)
      setRoleState(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(jwtToken),
      jwtToken,
      role,
      loginWithToken,
      logout,
    }),
    [jwtToken, role, loginWithToken, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
