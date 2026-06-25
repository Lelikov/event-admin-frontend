import { useEffect, useMemo, useState } from 'react'
import { getFutureEmailBouncedBookings } from './bookingsApi.ts'
import type { FutureEmailBouncedBooking } from './types.ts'
import { formatDateTime } from '../shared/format.ts'
import { ApiError } from '../shared/api.ts'
import { navigateTo } from '../shared/routing.ts'
import { getNotificationStatusLabel, getNotificationBounceVariant } from './statuses.ts'
import { useTimeZone } from '../settings/useTimeZone.ts'
import { UserInfo } from '../shared/UserInfo.tsx'
import { StatusBadge } from '../shared/StatusBadge.tsx'
import { Icon } from '../shared/Icon.tsx'

type Kpis = {
  total: number
  hard: number
  soft: number
  clients: number
}

function computeKpis(items: FutureEmailBouncedBooking[]): Kpis {
  let hard = 0
  let soft = 0
  const clients = new Set<string>()
  for (const item of items) {
    if (item.email_bounce_statuses.includes('hard_bounce')) hard += 1
    if (item.email_bounce_statuses.includes('soft_bounce')) soft += 1
    const clientId = item.client_participant?.user_id
    if (clientId) clients.add(clientId)
  }
  return { total: items.length, hard, soft, clients: clients.size }
}

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

  const kpis = useMemo(() => computeKpis(items), [items])
  const hasData = !loading && !error && items.length > 0

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="breadcrumb">Обзор <span className="sep">/</span> Дашборд</p>
          <h1>Проблемные бронирования</h1>
          <p className="muted">Будущие встречи с ошибками доставки email-уведомлений</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Обновить"
          title="Обновить"
          onClick={() => void load()}
        >
          <Icon name="refresh" size={16} />
        </button>
      </header>

      {hasData && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">
              <span className="kpi-dot" style={{ background: '#4f6ef2' }} />
              Проблемных броней
            </div>
            <div className="kpi-value">{kpis.total}</div>
            <div className="kpi-sub">требуют внимания</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">
              <span className="kpi-dot" style={{ background: '#dc3545' }} />
              Hard bounce
            </div>
            <div className="kpi-value is-danger">{kpis.hard}</div>
            <div className="kpi-sub">email недоступен</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">
              <span className="kpi-dot" style={{ background: '#f59e0b' }} />
              Soft bounce
            </div>
            <div className="kpi-value is-warning">{kpis.soft}</div>
            <div className="kpi-sub">временная ошибка</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">
              <span className="kpi-dot" style={{ background: '#94a3b8' }} />
              Затронуто клиентов
            </div>
            <div className="kpi-value">{kpis.clients}</div>
            <div className="kpi-sub">уникальных адресов</div>
          </div>
        </div>
      )}

      <article className="card">
        {loading && <p>Загрузка…</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="muted">Проблемных бронирований не найдено 🎉</p>
        )}

        {hasData && (
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
                        className="uid-chip"
                        onClick={() => navigateTo(`/bookings/${encodeURIComponent(item.booking_uid)}`)}
                      >
                        {item.booking_uid}
                      </button>
                    </td>
                    <td>{formatDateTime(item.start_date ?? item.end_time, timeZone)}</td>
                    <td>
                      <StatusBadge status={item.current_status} />
                    </td>
                    <td><UserInfo userId={item.organizer_participant?.user_id} /></td>
                    <td><UserInfo userId={item.client_participant?.user_id} /></td>
                    <td>
                      <div className="tag-list">
                        {item.email_bounce_statuses.map((status) => (
                          <span key={status} className={`badge badge--${getNotificationBounceVariant(status)}`}>
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
