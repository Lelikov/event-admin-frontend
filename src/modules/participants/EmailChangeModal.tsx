import { type FormEvent, useEffect, useState } from 'react'
import { ApiError } from '../shared/api.ts'
import { formatDateTime } from '../shared/format.ts'
import { invalidateUser } from '../shared/userBatchLoader.ts'
import { useTimeZone } from '../settings/useTimeZone.ts'
import {
  getEmailChangelog,
  reassignBookingClient,
  requestEmailChange,
  type EmailChangelogEntry,
} from './emailChangeApi.ts'

type Props = {
  userId: string
  currentEmail: string
  bookingUid?: string
  onClose: () => void
  onSuccess: () => void
}

const ERROR_MESSAGES: Record<string, string> = {
  'Email already in use by another client': 'Этот email уже используется другим клиентом',
  'User not found': 'Пользователь не найден',
  'Only client emails can be changed': 'Можно изменить только email клиента',
  'New email is the same as current email': 'Новый email совпадает с текущим',
}

function translateError(message: string): string {
  return ERROR_MESSAGES[message] ?? message
}

export function EmailChangeModal({ userId, currentEmail, bookingUid, onClose, onSuccess }: Props) {
  const { timeZone } = useTimeZone()
  const [newEmail, setNewEmail] = useState(currentEmail)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('Запрос на изменение отправлен')
  const [changelog, setChangelog] = useState<EmailChangelogEntry[]>([])
  const [changelogLoading, setChangelogLoading] = useState(true)
  const [confirmReassign, setConfirmReassign] = useState(false)

  useEffect(() => {
    let cancelled = false
    setChangelogLoading(true)
    getEmailChangelog(userId)
      .then((data) => {
        if (!cancelled) setChangelog(data.items)
      })
      .catch(() => {
        if (!cancelled) setChangelog([])
      })
      .finally(() => {
        if (!cancelled) setChangelogLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setConfirmReassign(false)

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
      // The change is applied asynchronously via RabbitMQ; dropping the cache
      // entry at least prevents the old email from being served indefinitely.
      invalidateUser(userId)
      setSuccessMessage('Запрос на изменение email отправлен')
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 && bookingUid) {
          setConfirmReassign(true)
          return
        }
        setError(translateError(err.message))
      } else {
        setError('Не удалось отправить запрос')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmReassign() {
    setSubmitting(true)
    setError(null)
    try {
      await reassignBookingClient(bookingUid!, newEmail.trim().toLowerCase())
      invalidateUser(userId)
      setSuccessMessage('Клиент встречи переназначен')
      setSuccess(true)
      setConfirmReassign(false)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      setConfirmReassign(false)
      if (err instanceof ApiError) {
        setError(translateError(err.message))
      } else {
        setError('Не удалось переназначить клиента')
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
            <p className="success-text">{successMessage}</p>
          ) : confirmReassign ? (
            <div>
              <p>
                Клиент с email <strong>{newEmail.trim().toLowerCase()}</strong> уже существует.
                Хотите назначить эту встречу данному клиенту?
              </p>
              <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Ранее отправленные уведомления на старый email останутся без изменений.
              </p>
              <div className="inline-actions" style={{ marginTop: '1rem' }}>
                <button type="button" onClick={handleConfirmReassign}>
                  Да, назначить
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setConfirmReassign(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
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
