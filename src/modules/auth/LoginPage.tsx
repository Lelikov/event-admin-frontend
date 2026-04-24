import { type FormEvent, useMemo, useState } from 'react'
import { ApiError } from '../shared/api.ts'
import { navigateTo } from '../shared/routing.ts'
import { login } from './authApi.ts'
import { useAuth } from './AuthContext.tsx'

const ENABLE_DEV_BYPASS_LOGIN = import.meta.env.VITE_ENABLE_DEV_BYPASS_LOGIN === 'true'
const DEV_BYPASS_JWT = import.meta.env.VITE_DEV_BYPASS_JWT ?? 'dev-bypass-jwt-token'

export function LoginPage() {
  const { loginWithToken } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && /^\d{6}$/.test(totpCode.trim()),
    [email, password, totpCode],
  )

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setError(null)
    setLoading(true)
    try {
      const response = await login({
        email: email.trim(),
        password,
        totp_code: totpCode.trim(),
      })
      loginWithToken(response.access_token, response.role)
      navigateTo('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось выполнить вход')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>Event Admin</h1>
        <p className="muted">Войдите через email, пароль и TOTP-код</p>

        <form className="form" onSubmit={handleLogin}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>TOTP-код (6 цифр)</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </label>

          <div className="inline-actions">
            <button type="submit" disabled={loading || !canSubmit}>
              {loading ? 'Входим…' : 'Войти'}
            </button>

            {import.meta.env.DEV && ENABLE_DEV_BYPASS_LOGIN && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const payload = JSON.parse(atob(DEV_BYPASS_JWT.split('.')[1]))
                  loginWithToken(DEV_BYPASS_JWT, payload.role || 'user')
                  navigateTo('/dashboard', { replace: true })
                }}
                disabled={loading}
              >
                Войти без TOTP (dev)
              </button>
            )}
          </div>
        </form>

        {import.meta.env.DEV && ENABLE_DEV_BYPASS_LOGIN && (
          <p className="hint">Dev bypass включён через VITE_ENABLE_DEV_BYPASS_LOGIN=true</p>
        )}
        {error && <p className="error-text">{error}</p>}
      </section>
    </main>
  )
}
