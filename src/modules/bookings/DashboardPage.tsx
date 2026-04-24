import { useEffect, useState } from 'react'
import { getFutureEmailBouncedBookings } from './bookingsApi.ts'
import type { FutureEmailBouncedBooking } from './types.ts'
import { formatDateTime } from '../shared/format.ts'
import { ApiError } from '../shared/api.ts'
import { navigateTo } from '../shared/routing.ts'
import { getBookingStatusLabel, getNotificationStatusLabel } from './statuses.ts'
import { useTimeZone } from '../settings/TimeZoneContext.tsx'
import { UserInfo } from '../shared/UserInfo.tsx'

export function DashboardPage() {
  const { timeZone } = useTimeZone()
  const [items, setItems] = useState<FutureEmailBouncedBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const response = await getFutureEmailBouncedBookings()
      setItems(response)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить данные дашборда')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Проблемные бронирования</h1>
          <p className="muted">Будущие встречи с проблемами по email-уведомлениям</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Обновить"
          title="Обновить"
          onClick={() => void load()}
        >
          ↻
        </button>
      </header>

      <article className="card">
        {loading && <p>Загрузка…</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="muted">Проблемных бронирований не найдено 🎉</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Старт</th>
                  <th>Статус</th>
                  <th>Организатор</th>
                  <th>Клиент</th>
                  <th>Проблема</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => navigateTo(`/bookings/${encodeURIComponent(item.booking_uid)}`)}
                      >
                        {item.booking_uid}
                      </button>
                    </td>
                    <td>{formatDateTime(item.start_date ?? item.end_time, timeZone)}</td>
                    <td>
                      <span className="tag">{getBookingStatusLabel(item.current_status)}</span>
                    </td>
                    <td><UserInfo userId={item.organizer_participant?.user_id} /></td>
                    <td><UserInfo userId={item.client_participant?.user_id} /></td>
                    <td>
                      <div className="tag-list">
                        {item.email_bounce_statuses.map((status) => (
                          <span key={status} className="tag danger">
                            {getNotificationStatusLabel(status)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
