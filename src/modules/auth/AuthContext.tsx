import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { clearUserCache } from '../shared/userBatchLoader.ts'
import { logoutRequest } from './authApi.ts'
import { AuthContext, type AuthContextValue } from './context.ts'
import { isTokenExpired } from './jwt.ts'
import { getJwtToken, removeJwtToken, setJwtToken } from './storage.ts'

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
      clearUserCache()
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
