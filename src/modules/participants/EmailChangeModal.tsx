import { type FormEvent, useEffect, useState } from 'react'
import { ApiError } from '../shared/api.ts'
import { formatDateTime } from '../shared/format.ts'
import { useTimeZone } from '../settings/TimeZoneContext.tsx'
import {
  getEmailChangelog,
  requestEmailChange,
  type EmailChangelogEntry,
} from './emailChangeApi.ts'

type Props = {
  userId: string
  currentEmail: string
  onClose: () => void
  onSuccess: () => void
}

export function EmailChangeModal({ userId, currentEmail, onClose, onSuccess }: Props) {
  const { timeZone } = useTimeZone()
  const [newEmail, setNewEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [changelog, setChangelog] = useState<EmailChangelogEntry[]>([])
  const [changelogLoading, setChangelogLoading] = useState(true)

  useEffect(() => {
    setChangelogLoading(true)
    getEmailChangelog(userId)
      .then((data) => setChangelog(data.items))
      .catch(() => setChangelog([]))
      .finally(() => setChangelogLoading(false))
  }, [userId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed) {
      setError('Введите email')
      return
    }
    if (trimmed === currentEmail.toLowerCase()) {
      setError('Новый email совпадает с текущим')
      return
    }

    setSubmitting(true)
    try {
      await requestEmailChange(userId, trimmed)
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Не удалось отправить запрос')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Изменить email клиента</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="field" style={{ marginBottom: '1rem' }}>
            <span className="field-label">Текущий email</span>
            <span className="field-value">{currentEmail}</span>
          </div>

          {success ? (
            <p className="success-text">Запрос на изменение отправлен</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="field">
                <span>Новый email</span>
                <input
                  type="email"
                  placeholder="new@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={submitting}
                  autoFocus
                  required
                />
              </label>

              {error && <p className="error-text">{error}</p>}

              <div className="inline-actions" style={{ marginTop: '1rem' }}>
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Отправка…' : 'Сохранить'}
                </button>
                <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
                  Отмена
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '2rem' }}>
            <h3>История изменений</h3>
            {changelogLoading && <p>Загрузка…</p>}
            {!changelogLoading && changelog.length === 0 && (
              <p className="muted">Нет истории изменений</p>
            )}
            {!changelogLoading && changelog.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Старый email</th>
                      <th>Новый email</th>
                      <th>Кто изменил</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changelog.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDateTime(entry.changed_at, timeZone)}</td>
                        <td>{entry.old_email}</td>
                        <td>{entry.new_email}</td>
                        <td>{entry.changed_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
