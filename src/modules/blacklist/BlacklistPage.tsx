import { type FormEvent, useEffect, useState } from 'react'
import { ApiError } from '../shared/api.ts'
import { formatDateTime } from '../shared/format.ts'
import { useTimeZone } from '../settings/useTimeZone.ts'
import { BlacklistEntryModal } from './BlacklistEntryModal.tsx'
import {
  deleteBlacklistEntry,
  getBlacklistEntries,
  translateBlacklistError,
  updateBlacklistEntry,
  type BlacklistEntry,
} from './blacklistApi.ts'
import { isEffectiveNow } from './effectiveness.ts'

const PAGE_SIZE = 50

const FIELD_LABELS: Record<string, string> = {
  client_email: 'Email клиента',
}

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

type Filters = {
  value?: string
  only_effective?: boolean
}

export function BlacklistPage() {
  const { timeZone } = useTimeZone()
  const [items, setItems] = useState<BlacklistEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [valueInput, setValueInput] = useState('')
  const [onlyEffective, setOnlyEffective] = useState(false)
  const [modalEntry, setModalEntry] = useState<BlacklistEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<BlacklistEntry | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  async function load(filters?: Filters, page = 0) {
    setLoading(true)
    setError(null)
    const currentOffset = page * PAGE_SIZE
    try {
      const data = await getBlacklistEntries({
        ...(filters?.value ? { value: filters.value } : {}),
        ...(filters?.only_effective ? { only_effective: true } : {}),
        limit: PAGE_SIZE,
        offset: currentOffset,
      })
      setItems(data.items)
      setTotal(data.total)
      setOffset(currentOffset)
    } catch (err) {
      setError(err instanceof ApiError ? translateBlacklistError(err) : 'Не удалось загрузить чёрный список')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function currentFilters(): Filters {
    return {
      ...(valueInput.trim() ? { value: valueInput.trim() } : {}),
      ...(onlyEffective ? { only_effective: true } : {}),
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    void load(currentFilters(), 0)
  }

  function handleReset() {
    setValueInput('')
    setOnlyEffective(false)
    void load(undefined, 0)
  }

  function reloadCurrentPage() {
    void load(currentFilters(), Math.floor(offset / PAGE_SIZE))
  }

  async function handleToggleActive(entry: BlacklistEntry) {
    setActionError(null)
    setMutatingId(entry.id)
    try {
      await updateBlacklistEntry(entry.id, { is_active: !entry.is_active })
      reloadCurrentPage()
    } catch (err) {
      setActionError(err instanceof ApiError ? translateBlacklistError(err) : 'Не удалось изменить запись')
    } finally {
      setMutatingId(null)
    }
  }

  async function handleConfirmDelete() {
    if (deleteCandidate === null) return
    setActionError(null)
    setMutatingId(deleteCandidate.id)
    try {
      await deleteBlacklistEntry(deleteCandidate.id)
      setDeleteCandidate(null)
      reloadCurrentPage()
    } catch (err) {
      setDeleteCandidate(null)
      setActionError(err instanceof ApiError ? translateBlacklistError(err) : 'Не удалось удалить запись')
    } finally {
      setMutatingId(null)
    }
  }

  const currentPage = Math.floor(offset / PAGE_SIZE)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Blacklist</p>
          <h1>Чёрный список</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalEntry(null)
            setModalOpen(true)
          }}
        >
          Добавить запись
        </button>
      </header>

      <article className="card">
        <form className="filters" onSubmit={handleSearch}>
          <label className="field">
            <span>Поиск по значению</span>
            <input
              type="text"
              placeholder="spam@example.com"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
            />
          </label>

          <label className="field checkbox-field">
            <input
              type="checkbox"
              checked={onlyEffective}
              onChange={(e) => setOnlyEffective(e.target.checked)}
            />
            <span>Только действующие</span>
          </label>

          <div className="inline-actions filters-actions">
            <button type="submit" disabled={loading}>
              Найти
            </button>
            <button type="button" className="secondary" onClick={handleReset} disabled={loading}>
              Сбросить
            </button>
          </div>
        </form>
      </article>

      <article className="card">
        {loading && <p>Загрузка…</p>}
        {error && <p className="error-text">{error}</p>}
        {actionError && <p className="error-text">{actionError}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="muted">Чёрный список пуст.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <p className="results-count">
              Найдено: {total}
              {totalPages > 1 && `, страница ${currentPage + 1} из ${totalPages}`}
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Поле</th>
                    <th>Значение</th>
                    <th>Активна</th>
                    <th>Действует сейчас</th>
                    <th>Действует с</th>
                    <th>Действует до</th>
                    <th>Комментарий</th>
                    <th>Автор</th>
                    <th>Обновлено</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="tag">{getFieldLabel(item.field)}</span>
                      </td>
                      <td>{item.value}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.is_active}
                          disabled={mutatingId === item.id}
                          onChange={() => void handleToggleActive(item)}
                          title={item.is_active ? 'Выключить' : 'Включить'}
                        />
                      </td>
                      <td>
                        {isEffectiveNow(item) ? (
                          <span className="tag danger">Блокирует</span>
                        ) : (
                          <span className="muted">Нет</span>
                        )}
                      </td>
                      <td>
                        {item.active_from !== null
                          ? formatDateTime(item.active_from, timeZone)
                          : <span className="muted">—</span>}
                      </td>
                      <td>
                        {item.active_until !== null
                          ? formatDateTime(item.active_until, timeZone)
                          : <span className="muted">—</span>}
                      </td>
                      <td>{item.comment ?? <span className="muted">—</span>}</td>
                      <td>{item.created_by}</td>
                      <td>{formatDateTime(item.updated_at, timeZone)}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className="secondary small"
                            disabled={mutatingId === item.id}
                            onClick={() => {
                              setModalEntry(item)
                              setModalOpen(true)
                            }}
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            className="secondary small"
                            disabled={mutatingId === item.id}
                            onClick={() => setDeleteCandidate(item)}
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="inline-actions" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="secondary"
                  disabled={currentPage === 0 || loading}
                  onClick={() => void load(currentFilters(), currentPage - 1)}
                >
                  ← Назад
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={currentPage >= totalPages - 1 || loading}
                  onClick={() => void load(currentFilters(), currentPage + 1)}
                >
                  Вперёд →
                </button>
              </div>
            )}
          </>
        )}
      </article>

      {modalOpen && (
        <BlacklistEntryModal
          entry={modalEntry}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            reloadCurrentPage()
          }}
        />
      )}

      {deleteCandidate !== null && (
        <div className="modal-overlay" onClick={() => setDeleteCandidate(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Удалить запись?</h2>
              <button type="button" className="modal-close" onClick={() => setDeleteCandidate(null)}>
                &times;
              </button>
            </div>
            <p>
              Запись <strong>{deleteCandidate.value}</strong> ({getFieldLabel(deleteCandidate.field)}) будет
              удалена безвозвратно. Бронирования с этим значением снова станут возможны.
            </p>
            <div className="inline-actions" style={{ marginTop: '1rem' }}>
              <button type="button" onClick={() => void handleConfirmDelete()} disabled={mutatingId !== null}>
                Удалить
              </button>
              <button type="button" className="secondary" onClick={() => setDeleteCandidate(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
