import { type FormEvent, useEffect, useState } from 'react'
import { getUsers, type UserItem } from './participantsApi.ts'
import { ApiError } from '../shared/api.ts'
import { formatDateTime } from '../shared/format.ts'
import { useTimeZone } from '../settings/useTimeZone.ts'

const PAGE_SIZE = 50

const ROLE_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'organizer', label: 'Организатор' },
  { value: 'client', label: 'Клиент' },
]

export function ParticipantsPage() {
  const { timeZone } = useTimeZone()
  const [items, setItems] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  async function load(email?: string, role?: string, page = 0) {
    setLoading(true)
    setError(null)
    const currentOffset = page * PAGE_SIZE
    try {
      const data = await getUsers({
        ...(email ? { email } : {}),
        ...(role ? { role } : {}),
        limit: PAGE_SIZE,
        offset: currentOffset,
      })
      setItems(data.items)
      setTotal(data.total)
      setOffset(currentOffset)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить пользователей')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    void load(emailInput || undefined, selectedRole || undefined, 0)
  }

  function handleReset() {
    setEmailInput('')
    setSelectedRole('')
    void load(undefined, undefined, 0)
  }

  const currentPage = Math.floor(offset / PAGE_SIZE)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Users</p>
          <h1>Пользователи</h1>
        </div>
      </header>

      <article className="card">
        <form className="filters" onSubmit={handleSearch}>
          <label className="field">
            <span>Поиск по email</span>
            <input
              type="text"
              placeholder="example@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Роль</span>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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

        {!loading && !error && items.length === 0 && (
          <p className="muted">Нет пользователей для отображения.</p>
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
                    <th>ID</th>
                    <th>Email</th>
                    <th>Имя</th>
                    <th>Роль</th>
                    <th>Часовой пояс</th>
                    <th>Дата регистрации</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="muted tabular" title={item.id}>
                        {item.id.slice(0, 8)}…
                      </td>
                      <td>{item.email}</td>
                      <td>{item.name ?? <span className="muted">—</span>}</td>
                      <td>
                        <span className="tag">{item.role}</span>
                      </td>
                      <td>{item.time_zone ?? <span className="muted">—</span>}</td>
                      <td>{formatDateTime(item.created_at, timeZone)}</td>
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
                  onClick={() => void load(emailInput || undefined, selectedRole || undefined, currentPage - 1)}
                >
                  ← Назад
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={currentPage >= totalPages - 1 || loading}
                  onClick={() => void load(emailInput || undefined, selectedRole || undefined, currentPage + 1)}
                >
                  Вперёд →
                </button>
              </div>
            )}
          </>
        )}
      </article>
    </section>
  )
}
