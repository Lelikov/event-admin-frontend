import { type FormEvent, useState } from 'react'
import { ApiError } from '../shared/api.ts'
import {
  createBlacklistEntry,
  translateBlacklistError,
  updateBlacklistEntry,
  type BlacklistEntry,
  type BlacklistUpdatePayload,
} from './blacklistApi.ts'
import { fromDatetimeLocalValue, toDatetimeLocalValue } from './effectiveness.ts'

// Today only client_email is checked by event-booking; new check-fields are new
// option entries here (the backend stores `field` as an open string).
const FIELD_OPTIONS = [{ value: 'client_email', label: 'Email клиента' }]

type Props = {
  /** null — режим добавления; запись — режим редактирования. */
  entry: BlacklistEntry | null
  onClose: () => void
  onSaved: () => void
}

export function BlacklistEntryModal({ entry, onClose, onSaved }: Props) {
  const [field, setField] = useState(entry?.field ?? 'client_email')
  const [value, setValue] = useState(entry?.value ?? '')
  const [isActive, setIsActive] = useState(entry?.is_active ?? true)
  const [activeFrom, setActiveFrom] = useState(toDatetimeLocalValue(entry?.active_from ?? null))
  const [activeUntil, setActiveUntil] = useState(toDatetimeLocalValue(entry?.active_until ?? null))
  const [comment, setComment] = useState(entry?.comment ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buildUpdatePayload(existing: BlacklistEntry): BlacklistUpdatePayload {
    const payload: BlacklistUpdatePayload = {}
    const trimmedValue = value.trim()
    const normalizedComment = comment.trim() === '' ? null : comment.trim()
    const fromIso = fromDatetimeLocalValue(activeFrom)
    const untilIso = fromDatetimeLocalValue(activeUntil)
    if (field !== existing.field) payload.field = field
    if (trimmedValue !== existing.value) payload.value = trimmedValue
    if (isActive !== existing.is_active) payload.is_active = isActive
    if (fromIso !== normalizeIso(existing.active_from)) payload.active_from = fromIso
    if (untilIso !== normalizeIso(existing.active_until)) payload.active_until = untilIso
    if (normalizedComment !== existing.comment) payload.comment = normalizedComment
    return payload
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedValue = value.trim()
    if (!trimmedValue) {
      setError('Введите значение')
      return
    }
    const fromIso = fromDatetimeLocalValue(activeFrom)
    const untilIso = fromDatetimeLocalValue(activeUntil)
    if (fromIso !== null && untilIso !== null && fromIso > untilIso) {
      setError('Дата начала действия не может быть позже даты окончания')
      return
    }

    setSubmitting(true)
    try {
      if (entry === null) {
        await createBlacklistEntry({
          field,
          value: trimmedValue,
          is_active: isActive,
          active_from: fromIso,
          active_until: untilIso,
          comment: comment.trim() === '' ? null : comment.trim(),
        })
        onSaved()
        return
      }

      const payload = buildUpdatePayload(entry)
      if (Object.keys(payload).length === 0) {
        setError('Нет изменений для сохранения')
        return
      }
      await updateBlacklistEntry(entry.id, payload)
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(translateBlacklistError(err))
        return
      }
      setError('Не удалось сохранить запись')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{entry === null ? 'Добавить в чёрный список' : 'Изменить запись'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Поле</span>
            <select value={field} onChange={(e) => setField(e.target.value)} disabled={submitting}>
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Значение</span>
            <input
              type="text"
              placeholder="spam@example.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={submitting}
              autoFocus={entry === null}
              required
            />
          </label>

          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={submitting}
            />
            <span>Активна</span>
          </label>

          <label className="field">
            <span>Действует с (необязательно)</span>
            <div className="inline-actions">
              <input
                type="datetime-local"
                value={activeFrom}
                onChange={(e) => setActiveFrom(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="secondary small"
                onClick={() => setActiveFrom('')}
                disabled={submitting || activeFrom === ''}
              >
                Очистить
              </button>
            </div>
          </label>

          <label className="field">
            <span>Действует до (необязательно)</span>
            <div className="inline-actions">
              <input
                type="datetime-local"
                value={activeUntil}
                onChange={(e) => setActiveUntil(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="secondary small"
                onClick={() => setActiveUntil('')}
                disabled={submitting || activeUntil === ''}
              >
                Очистить
              </button>
            </div>
          </label>

          <label className="field">
            <span>Комментарий (необязательно)</span>
            <input
              type="text"
              placeholder="Причина блокировки"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              maxLength={1000}
            />
          </label>

          {error && <p className="error-text">{error}</p>}

          <div className="inline-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Backend returns timestamps with offsets; compare on the millisecond timeline
// so an unchanged datetime-local input does not produce a spurious PATCH key.
function normalizeIso(iso: string | null): string | null {
  if (iso === null) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  // datetime-local has minute precision: drop seconds the same way the input does.
  date.setSeconds(0, 0)
  return date.toISOString()
}
