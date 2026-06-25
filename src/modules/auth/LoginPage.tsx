import { type FormEvent, useMemo, useState } from 'react'
import { ApiError } from '../shared/api.ts'
import { navigateTo } from '../shared/routing.ts'
import { login } from './authApi.ts'
import { useAuth } from './useAuth.ts'

const ENABLE_DEV_BYPASS_LOGIN = import.meta.env.VITE_ENABLE_DEV_BYPASS_LOGIN === 'true'
const DEV_BYPASS_JWT: string = import.meta.env.VITE_DEV_BYPASS_JWT ?? ''

// Keyed on stable error codes from event-admin (detail.code); the status
// checks remain as a rollout fallback for responses without a code.
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Неверный email, пароль или TOTP-код',
  too_many_login_attempts: 'Слишком много неудачных попыток входа. Попробуйте позже.',
}

function translateLoginError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Не удалось выполнить вход'
  if (err.code !== null && err.code in LOGIN_ERROR_MESSAGES) return LOGIN_ERROR_MESSAGES[err.code]
  if (err.status === 401) return LOGIN_ERROR_MESSAGES.invalid_credentials
  if (err.status === 429) return LOGIN_ERROR_MESSAGES.too_many_login_attempts
  return err.message
}

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
      loginWithToken(response.access_token)
      navigateTo('/dashboard', { replace: true })
    } catch (err) {
      setError(translateLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const showDevBypass =
    import.meta.env.DEV && ENABLE_DEV_BYPASS_LOGIN && DEV_BYPASS_JWT !== ''

  return (
    <main className="login-shell">
      <section className="login-split">
        <aside className="login-brand">
          <div className="login-brand-dots" />
          <div className="login-brand-logo">
            <div className="app-logo">EA</div>
            <span>Event Admin</span>
          </div>
          <div>
            <h1>Панель управления<br />бронированиями</h1>
            <p>Мониторинг встреч, проблемных уведомлений и чёрного списка в одном месте.</p>
          </div>
          <div className="login-brand-foot">Защищено TOTP · сессия 60 минут</div>
        </aside>

        <div className="login-form-panel">
          <div>
            <p className="eyebrow">Вход в систему</p>
            <h1>С возвращением</h1>
          </div>

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

              {showDevBypass && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    loginWithToken(DEV_BYPASS_JWT)
                    navigateTo('/dashboard', { replace: true })
                  }}
                  disabled={loading}
                >
                  Войти без TOTP (dev)
                </button>
              )}
            </div>
          </form>

          {showDevBypass && (
            <p className="hint">Dev bypass включён через VITE_ENABLE_DEV_BYPASS_LOGIN=true</p>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>
      </section>
    </main>
  )
}
