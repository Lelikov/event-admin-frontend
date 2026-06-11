import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { logoutRequest } from './authApi.ts'
import { isTokenExpired } from './jwt.ts'
import { getJwtToken, removeJwtToken, setJwtToken } from './storage.ts'

type AuthContextValue = {
  isAuthenticated: boolean
  jwtToken: string | null
  loginWithToken: (token: string) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

function getValidStoredToken(): string | null {
  const token = getJwtToken()
  if (token && isTokenExpired(token)) {
    removeJwtToken()
    return null
  }
  return token
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [jwtToken, setJwtTokenState] = useState<string | null>(() => getValidStoredToken())

  const loginWithToken = useCallback((token: string) => {
    setJwtToken(token)
    setJwtTokenState(token)
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
      setJwtTokenState(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(jwtToken),
      jwtToken,
      loginWithToken,
      logout,
    }),
    [jwtToken, loginWithToken, logout],
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
