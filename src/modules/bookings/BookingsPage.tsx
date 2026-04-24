import { type FormEvent, useEffect, useState } from 'react'
import { getBookings, type GetBookingsFilters } from './bookingsApi.ts'
import type { BookingListItem } from './types.ts'
import { formatDateTime } from '../shared/format.ts'
import { ApiError } from '../shared/api.ts'
import { navigateTo } from '../shared/routing.ts'
import { UserInfo } from '../shared/UserInfo.tsx'
import { BOOKING_STATUS_FILTER_OPTIONS, getBookingStatusLabel } from './statuses.ts'
import { useTimeZone } from '../settings/TimeZoneContext.tsx'
import { ParticipantPicker, type PickedParticipant } from '../shared/ParticipantPicker.tsx'
import { StatusFilter } from '../shared/StatusFilter.tsx'

const ORGANIZER_ROLES = ['organizer']
const CLIENT_ROLES = ['client']

export function BookingsPage() {
  const { timeZone } = useTimeZone()
  const [items, setItems] = useState<BookingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingUidsInput, setBookingUidsInput] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedOrganizers, setSelectedOrganizers] = useState<PickedParticipant[]>([])
  const [selectedClients, setSelectedClients] = useState<PickedParticipant[]>([])

  function parseCsv(input: string): string[] {
    return input
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
  }

  async function load(filters?: GetBookingsFilters) {
    setLoading(true)
    setError(null)
    try {
      const response = await getBookings(filters)
      setItems(response)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить бронирования')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void load({
      booking_uids: parseCsv(bookingUidsInput),
      current_statuses: selectedStatuses,
      current_organizer_user_ids: selectedOrganizers.map((p) => p.id),
      current_client_user_ids: selectedClients.map((p) => p.id),
    })
  }

  function handleResetFilters() {
    setBookingUidsInput('')
    setSelectedStatuses([])
    setSelectedOrganizers([])
    setSelectedClients([])
    void load()
  }

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Bookings</p>
          <h1>Список бронирований</h1>
        </div>
      </header>

      <article className="card">
        <form className="filters" onSubmit={handleSearch}>
          <label className="field">
            <span>Booking UIDs (через запятую)</span>
            <input
              type="text"
              placeholder="uid1, uid2, …"
              value={bookingUidsInput}
              onChange={(e) => setBookingUidsInput(e.target.value)}
            />
          </label>

          <StatusFilter
            label="Статус"
            options={BOOKING_STATUS_FILTER_OPTIONS}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
          />

          <ParticipantPicker
            label="Организатор"
            selected={selectedOrganizers}
            onChange={setSelectedOrganizers}
            placeholder="Поиск организатора по email…"
            roles={ORGANIZER_ROLES}
          />

          <ParticipantPicker
            label="Клиент"
            selected={selectedClients}
            onChange={setSelectedClients}
            placeholder="Поиск клиента по email…"
            roles={CLIENT_ROLES}
          />

          <div className="inline-actions filters-actions">
            <button type="submit" disabled={loading}>
              Найти
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleResetFilters}
              disabled={loading}
            >
              Сбросить
            </button>
          </div>
        </form>
      </article>

      <article className="card">
        {loading && <p>Загрузка…</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="muted">Нет бронирований для отображения.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <p className="results-count">Найдено: {items.length}</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>UID</th>
                    <th>Старт</th>
                    <th>Окончание</th>
                    <th>Статус</th>
                    <th>Организатор</th>
                    <th>Клиент</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() =>
                            navigateTo(`/bookings/${encodeURIComponent(item.booking_uid)}`)
                          }
                        >
                          {item.booking_uid}
                        </button>
                      </td>
                      <td>{formatDateTime(item.start_time, timeZone)}</td>
                      <td>{formatDateTime(item.end_time, timeZone)}</td>
                      <td>
                        <span className="tag">{getBookingStatusLabel(item.current_status)}</span>
                      </td>
                      <td><UserInfo userId={item.organizer_participant?.user_id} variant="inline" /></td>
                      <td><UserInfo userId={item.client_participant?.user_id} variant="inline" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  )
}
