import { useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../shared/api.ts'
import { formatDateTime } from '../shared/format.ts'
import { navigateTo } from '../shared/routing.ts'
import { useTimeZone } from '../settings/useTimeZone.ts'
import { getBookingDetails, sendClientReminder } from './bookingsApi.ts'
import {
  getBookingStatusLabel,
  getChatEventIcon,
  getLifecycleActionIcon,
  getLifecycleActionLabel,
  getNotificationStatusLabel,
  getParticipantRoleLabel,
  getTriggerEventLabel,
  isNotificationBounceStatus,
} from './statuses.ts'
import type { BookingDetails, LifecycleEvent, VideoEvent } from './types.ts'
import { UserInfo } from '../shared/UserInfo.tsx'
import { EmailChangeModal } from '../participants/EmailChangeModal.tsx'
import { getCachedUser } from '../shared/userBatchLoader.ts'

const REMINDER_INELIGIBLE_STATUSES = new Set(['cancelled', 'completed', 'no_show'])

function canSendReminder(item: BookingDetails): boolean {
  const clientUserId = item.current_client_participant?.user_id ?? null
  if (!clientUserId) return false
  if (REMINDER_INELIGIBLE_STATUSES.has(item.current_status ?? '')) return false
  if (!item.start_time) return false
  return new Date(item.start_time).getTime() > Date.now()
}

type BookingDetailsPageProps = {
  bookingUid: string
}

function getLabels(devices: unknown): string[] {
  if (!Array.isArray(devices)) {
    return []
  }

  return devices
    .map((device) => {
      if (typeof device === 'object' && device !== null && 'label' in device) {
        return String(device.label).trim()
      }
      return ''
    })
    .filter((label) => label.length > 0)
}

type DeviceKind = 'audioInput' | 'videoInput' | 'audioOutput'

const ACCESS_TITLES: Record<DeviceKind, string> = {
  audioInput: 'микрофону',
  videoInput: 'камере',
  audioOutput: 'динамику',
}

const ACCESS_ICONS: Record<DeviceKind, string> = {
  audioInput: '🎤',
  videoInput: '📷',
  audioOutput: '🔊',
}

function describeAccess(kind: DeviceKind, devices: unknown): ReactNode {
  const labels = getLabels(devices)
  const title = ACCESS_TITLES[kind]
  const icon = ACCESS_ICONS[kind]
  const toneClass = labels.length > 0 ? 'is-positive' : 'is-negative'

  if (labels.length === 0) {
    return (
      <div>
        <span className={`event-status-icon ${toneClass}`} aria-hidden="true">
          {icon}
        </span>{' '}
        {`Доступ к ${title} не предоставлен`}
      </div>
    )
  }

  return (
    <div>
      <div>
        <span className={`event-status-icon ${toneClass}`} aria-hidden="true">
          {icon}
        </span>{' '}
        {`Доступ к ${title} предоставлен`}
      </div>
      <ul className="device-list">
        {labels.map((label) => (
          <li key={`${kind}-${label}`}>{label}</li>
        ))}
      </ul>
    </div>
  )
}

function getVideoEventIconMeta(
  event: VideoEvent,
): { icon: string; tone: 'is-positive' | 'is-negative' | 'is-neutral' } {
  if (event.video_event_type === 'audioMuteStatusChanged') {
    const muted =
      typeof event.payload === 'object' && event.payload !== null && 'muted' in event.payload
        ? Boolean(event.payload.muted)
        : false
    return { icon: '🎤', tone: muted ? 'is-negative' : 'is-positive' }
  }

  if (event.video_event_type === 'videoMuteStatusChanged') {
    const muted =
      typeof event.payload === 'object' && event.payload !== null && 'muted' in event.payload
        ? Boolean(event.payload.muted)
        : false
    return { icon: '📷', tone: muted ? 'is-negative' : 'is-positive' }
  }

  if (event.video_event_type === 'participantMuted') {
    const mediaType =
      typeof event.payload === 'object' && event.payload !== null && 'mediaType' in event.payload
        ? String(event.payload.mediaType)
        : ''
    const isMuted =
      typeof event.payload === 'object' && event.payload !== null && 'isMuted' in event.payload
        ? Boolean(event.payload.isMuted)
        : false

    if (mediaType === 'audio') {
      return { icon: '🎤', tone: isMuted ? 'is-negative' : 'is-positive' }
    }
    if (mediaType === 'video') {
      return { icon: '📷', tone: isMuted ? 'is-negative' : 'is-positive' }
    }
    return { icon: '🔇', tone: 'is-neutral' }
  }

  switch (event.video_event_type) {
    case 'deviceListChanged':
      return { icon: '🧩', tone: 'is-neutral' }
    case 'participantJoined':
    case 'videoConferenceJoined':
      return { icon: '✅', tone: 'is-positive' }
    case 'participantLeft':
    case 'videoConferenceLeft':
      return { icon: '🚪', tone: 'is-negative' }
    case 'dominantSpeakerChanged':
      return { icon: '🗣️', tone: 'is-neutral' }
    case 'errorOccurred':
      return { icon: '⚠️', tone: 'is-negative' }
    default:
      return { icon: '•', tone: 'is-neutral' }
  }
}

function getVideoEventDescription(event: VideoEvent): ReactNode {
  const payload = event.payload ?? {}

  if (event.video_event_type === 'deviceListChanged') {
    const devices =
      typeof payload === 'object' && payload !== null && 'devices' in payload
        ? (payload.devices as Record<string, unknown>)
        : {}

    return (
      <div className="device-access-list">
        {describeAccess('audioInput', devices.audioInput)}
        {describeAccess('videoInput', devices.videoInput)}
        {describeAccess('audioOutput', devices.audioOutput)}
      </div>
    )
  }

  if (event.video_event_type === 'audioMuteStatusChanged') {
    const muted =
      typeof payload === 'object' && payload !== null && 'muted' in payload
        ? Boolean(payload.muted)
        : false
    return muted ? 'Микрофон выключен' : 'Микрофон включен'
  }

  if (event.video_event_type === 'videoMuteStatusChanged') {
    const muted =
      typeof payload === 'object' && payload !== null && 'muted' in payload
        ? Boolean(payload.muted)
        : false
    return muted ? 'Камера выключена' : 'Камера включена'
  }

  if (event.video_event_type === 'participantMuted') {
    const mediaType =
      typeof payload === 'object' && payload !== null && 'mediaType' in payload
        ? String(payload.mediaType)
        : ''
    const isMuted =
      typeof payload === 'object' && payload !== null && 'isMuted' in payload
        ? Boolean(payload.isMuted)
        : false

    if (mediaType === 'audio') {
      return isMuted ? 'Микрофон выключен' : 'Микрофон включен'
    }

    if (mediaType === 'video') {
      return isMuted ? 'Камера выключена' : 'Камера включена'
    }

    return 'Изменение mute-статуса участника'
  }

  if (event.video_event_type === 'participantJoined' || event.video_event_type === 'videoConferenceJoined') {
    return 'Участник присоединился к звонку'
  }

  if (event.video_event_type === 'participantLeft' || event.video_event_type === 'videoConferenceLeft') {
    return 'Участник вышел из звонка'
  }

  if (event.video_event_type === 'dominantSpeakerChanged') {
    return 'Смена активного спикера'
  }

  if (event.video_event_type === 'errorOccurred') {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? (payload.error as { name?: string; params?: unknown[] })
        : undefined

    const errorName = message?.name ? ` (${message.name})` : ''
    const errorText = Array.isArray(message?.params) && message?.params[0] ? String(message.params[0]) : ''
    return `Ошибка конференции${errorName}${errorText ? `: ${errorText}` : ''}`
  }

  return `Событие: ${event.video_event_type}`
}

function getLifecycleDetails(event: LifecycleEvent, timeZone: string | undefined): ReactNode {
  const details = event.details
  if (!details || typeof details !== 'object') return null

  if (event.action === 'created' || event.action === 'rescheduled') {
    const startTime = typeof details.start_time === 'string' ? details.start_time : null
    const endTime = typeof details.end_time === 'string' ? details.end_time : null
    const prevStart =
      typeof details['previous_booking.start_time'] === 'string'
        ? details['previous_booking.start_time']
        : null

    return (
      <div className="lifecycle-details">
        {prevStart && (
          <div className="muted">Было: {formatDateTime(prevStart, timeZone)}</div>
        )}
        {startTime && <div>Начало: {formatDateTime(startTime, timeZone)}</div>}
        {endTime && <div>Окончание: {formatDateTime(endTime, timeZone)}</div>}
      </div>
    )
  }

  if (event.action === 'reassigned') {
    const prevOrgId =
      typeof details.previous_organizer_user_id === 'string' ? details.previous_organizer_user_id : null
    return (
      <div className="lifecycle-details">
        {prevOrgId && (
          <div>
            <span className="muted">Пред. организатор: </span>
            <UserInfo userId={prevOrgId} variant="inline" />
          </div>
        )}
      </div>
    )
  }

  if (event.action === 'cancelled') {
    const reason =
      typeof details.cancellation_reason === 'string' ? details.cancellation_reason : null
    if (reason) {
      return <div className="lifecycle-details muted">Причина: {reason}</div>
    }
    return null
  }

  return null
}

export function BookingDetailsPage({ bookingUid }: BookingDetailsPageProps) {
  const { timeZone } = useTimeZone()
  const [item, setItem] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingClientEmail, setEditingClientEmail] = useState<{ id: string; email: string } | null>(null)
  // Bumping the counter re-runs the load effect (used after email change/reassign).
  const [reloadCounter, setReloadCounter] = useState(0)
  const [reminderState, setReminderState] = useState<{ sending: boolean; ok: string | null; error: string | null }>({
    sending: false,
    ok: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await getBookingDetails(bookingUid)
        if (!cancelled) {
          setItem(response)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить детали бронирования')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [bookingUid, reloadCounter])

  async function handleSendReminder(item: BookingDetails) {
    if (!window.confirm('Отправить клиенту письмо-напоминание о встрече?')) return
    setReminderState({ sending: true, ok: null, error: null })
    try {
      const res = await sendClientReminder(item.booking_uid)
      setReminderState({ sending: false, ok: res.email, error: null })
    } catch (err) {
      setReminderState({
        sending: false,
        ok: null,
        error: err instanceof ApiError ? err.message : 'Не удалось отправить напоминание',
      })
    }
  }

  return (
    <>
    <section className="stack">
      <header className="page-header">
        <div>
          <button type="button" className="back-button" onClick={() => navigateTo('/bookings')}>
            ← Назад к списку
          </button>
          <p className="eyebrow">Booking details</p>
          <h1>{bookingUid}</h1>
        </div>
      </header>

      {loading && <article className="card">Загрузка…</article>}
      {error && <article className="card error-text">{error}</article>}

      {!loading && !error && item && (
        <>
          <article className="card grid-2">
            <div>
              <p className="muted">Статус</p>
              <p>
                <span className="tag">{getBookingStatusLabel(item.current_status)}</span>
              </p>
            </div>
            <div>
              <p className="muted">Создано</p>
              <p>{formatDateTime(item.created_at, timeZone)}</p>
            </div>
            <div>
              <p className="muted">Старт</p>
              <p>{formatDateTime(item.start_time, timeZone)}</p>
            </div>
            <div>
              <p className="muted">Окончание</p>
              <p>{formatDateTime(item.end_time, timeZone)}</p>
            </div>
          </article>

          <article className="card grid-2">
            <div>
              <h3>Текущий организатор</h3>
              <p><UserInfo userId={item.current_organizer_participant?.user_id} /></p>
            </div>
            <div>
              <h3>Текущий клиент</h3>
              <p>
                <UserInfo userId={item.current_client_participant?.user_id} />
                {item.current_client_participant?.user_id && (
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => {
                      if (!item.current_client_participant?.user_id) return
                      const cached = getCachedUser(item.current_client_participant.user_id)
                      setEditingClientEmail({
                        id: item.current_client_participant.user_id,
                        email: cached?.email ?? '',
                      })
                    }}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    Изменить email
                  </button>
                )}
                {item.current_client_participant?.user_id && (
                  <button
                    type="button"
                    className="secondary small"
                    disabled={!canSendReminder(item) || reminderState.sending}
                    title={canSendReminder(item) ? '' : 'Доступно только для будущей активной встречи с привязанным аккаунтом клиента'}
                    onClick={() => void handleSendReminder(item)}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {reminderState.sending ? 'Отправка…' : 'Отправить напоминание'}
                  </button>
                )}
              </p>
              {(reminderState.ok || reminderState.error) && (
                <p style={{ marginTop: '4px' }}>
                  {reminderState.ok && (
                    <span style={{ fontSize: '12px', color: 'var(--success)' }}>
                      Отправлено на {reminderState.ok}
                    </span>
                  )}
                  {reminderState.error && (
                    <span className="error-text" style={{ fontSize: '12px' }}>{reminderState.error}</span>
                  )}
                </p>
              )}
            </div>
          </article>

          <article className="card">
            <h3>История бронирования</h3>
            {item.lifecycle_events.length === 0 ? (
              <p className="muted">Нет событий</p>
            ) : (
              <ul className="list events-list">
                {[...item.lifecycle_events]
                  .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
                  .map((event) => (
                    <li key={event.id}>
                      <div>
                        <span aria-hidden="true">
                          {getLifecycleActionIcon(event.action)}
                        </span>{' '}
                        <strong>{getLifecycleActionLabel(event.action)}</strong>
                        <span className="muted timeline-time">
                          {formatDateTime(event.occurred_at, timeZone)}
                        </span>
                      </div>
                      <div>
                        {event.organizer_participant?.user_id && (
                          <span>
                            <span className="muted">Организатор: </span>
                            <UserInfo userId={event.organizer_participant.user_id} variant="inline" />
                            {' '}
                          </span>
                        )}
                        {event.client_participant?.user_id && (
                          <span>
                            <span className="muted">Клиент: </span>
                            <UserInfo userId={event.client_participant.user_id} variant="inline" />
                          </span>
                        )}
                      </div>
                      {getLifecycleDetails(event, timeZone)}
                    </li>
                  ))}
              </ul>
            )}
          </article>

          <article className="card">
            <h3>Email-уведомления</h3>
            {item.email_notifications.length === 0 ? (
              <p className="muted">Нет записей</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Участник</th>
                      <th>Событие</th>
                      <th>Отправлено</th>
                      <th>История статусов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.email_notifications.map((notification) => (
                      <tr key={notification.id}>
                        <td>
                          {notification.recipient_email ? (
                            <span>{notification.recipient_email}</span>
                          ) : (
                            <UserInfo userId={notification.participant?.user_id} variant="inline" />
                          )}
                        </td>
                        <td>{getTriggerEventLabel(notification.trigger_event)}</td>
                        <td>{formatDateTime(notification.sent_at, timeZone)}</td>
                        <td>
                          <div className="tag-list">
                            {notification.status_history.length > 0 ? (
                              notification.status_history.map((statusEntry) => (
                                <span
                                  key={statusEntry.id}
                                  className={
                                    isNotificationBounceStatus(statusEntry.status) ? 'tag danger' : 'tag'
                                  }
                                >
                                  {getNotificationStatusLabel(statusEntry.status)}
                                </span>
                              ))
                            ) : (
                              <span
                                className={
                                  isNotificationBounceStatus(notification.last_status)
                                    ? 'tag danger'
                                    : 'tag'
                                }
                              >
                                {getNotificationStatusLabel(notification.last_status)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="card">
            <h3>Telegram-уведомления</h3>
            {item.telegram_notifications.length === 0 ? (
              <p className="muted">Нет записей</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Участник</th>
                      <th>Событие</th>
                      <th>Отправлено</th>
                      <th>Создано</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.telegram_notifications.map((notification) => (
                      <tr key={notification.id}>
                        <td>
                          {notification.recipient_email ? (
                            <span>{notification.recipient_email}</span>
                          ) : (
                            <UserInfo userId={notification.participant?.user_id} variant="inline" />
                          )}
                        </td>
                        <td>{getTriggerEventLabel(notification.trigger_event)}</td>
                        <td>{formatDateTime(notification.sent_at, timeZone)}</td>
                        <td>{formatDateTime(notification.created_at, timeZone)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="card">
            <h3>Ссылки на встречу</h3>
            {item.meeting_links.length === 0 ? (
              <p className="muted">Нет ссылок</p>
            ) : (
              <ul className="list">
                {item.meeting_links.map((link) => (
                  <li key={link.id}>
                    <a href={link.meeting_url} target="_blank" rel="noreferrer">
                      <UserInfo userId={link.participant.user_id} fallback="Ссылка" variant="name" />
                    </a>{' '}
                    <span className="muted">· {formatDateTime(link.created_at, timeZone)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card">
            <h3>События чата</h3>
            {item.chat_events.length === 0 ? (
              <p className="muted">Нет событий</p>
            ) : (
              <ul className="list events-list">
                {item.chat_events.map((event) => (
                  <li key={event.id}>
                    <div>
                      <span aria-hidden="true">
                        {getChatEventIcon(event.chat_event_type)}
                      </span>{' '}
                      <span className="tag"><UserInfo userId={event.participant?.user_id} variant="name" /></span>
                      <span className="muted timeline-time">
                        {formatDateTime(event.occurred_at, timeZone)}
                      </span>
                    </div>
                    {event.text_preview ? <div>{event.text_preview}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card">
            <h3>Видео-события</h3>
            {item.video_events.length === 0 ? (
              <p className="muted">Нет событий</p>
            ) : (
              <ol className="timeline">
                {[...item.video_events]
                  .sort((a, b) => new Date(a.event_time ?? 0).getTime() - new Date(b.event_time ?? 0).getTime())
                  .map((event) => (
                    <li
                      key={event.id}
                      className={`timeline-item ${
                        event.participant_role === 'organizer'
                          ? 'timeline-item-organizer'
                          : 'timeline-item-client'
                      }`}
                    >
                      <div>
                        <span
                          className={`event-status-icon ${getVideoEventIconMeta(event).tone}`}
                          aria-hidden="true"
                        >
                          {getVideoEventIconMeta(event).icon}
                        </span>{' '}
                        <span className="tag">{getParticipantRoleLabel(event.participant_role)}</span>
                        <span className="muted timeline-time">
                          {formatDateTime(event.event_time, timeZone)}
                        </span>
                      </div>
                      <div>{getVideoEventDescription(event)}</div>
                    </li>
                  ))}
              </ol>
            )}
          </article>
        </>
      )}
    </section>
    {editingClientEmail && (
      <EmailChangeModal
        userId={editingClientEmail.id}
        currentEmail={editingClientEmail.email}
        bookingUid={bookingUid}
        onClose={() => setEditingClientEmail(null)}
        onSuccess={() => {
          setEditingClientEmail(null)
          setReloadCounter((counter) => counter + 1)
        }}
      />
    )}
    </>
  )
}
