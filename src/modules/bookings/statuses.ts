export const BookingStatus = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  RESCHEDULED: 'rescheduled',
} as const

export const NotificationStatus = {
  ACCEPTED: 'accepted',
  SENT: 'sent',
  DELIVERED: 'delivered',
  CLICKED: 'clicked',
  SOFT_BOUNCED: 'soft_bounce',
  HARD_BOUNCED: 'hard_bounce',
} as const

export const TriggerEvent = {
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_RESCHEDULED: 'BOOKING_RESCHEDULED',
  BOOKING_REMINDER: 'BOOKING_REMINDER',
} as const

export const ChatEventType = {
  CHANNEL_CREATED: 'channel.created',
  CHANNEL_DELETED: 'channel.deleted',
  MESSAGE_NEW: 'message.new',
} as const

const BOOKING_STATUS_LABELS: Record<string, string> = {
  [BookingStatus.CREATED]: 'Создано',
  [BookingStatus.CONFIRMED]: 'Подтверждено',
  [BookingStatus.CANCELLED]: 'Отменено',
  [BookingStatus.COMPLETED]: 'Завершено',
  [BookingStatus.IN_PROGRESS]: 'В процессе',
  [BookingStatus.RESCHEDULED]: 'Перенесено',
}

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  [NotificationStatus.ACCEPTED]: 'Принято',
  [NotificationStatus.SENT]: 'Отправлено',
  [NotificationStatus.DELIVERED]: 'Доставлено',
  [NotificationStatus.CLICKED]: 'Переход по ссылке',
  [NotificationStatus.SOFT_BOUNCED]: 'Неправильный email',
  [NotificationStatus.HARD_BOUNCED]: 'Неправильный email',
}

const TRIGGER_EVENT_LABELS: Record<string, string> = {
  [TriggerEvent.BOOKING_CREATED]: 'Бронирование создано',
  [TriggerEvent.BOOKING_CANCELLED]: 'Бронирование отменено',
  [TriggerEvent.BOOKING_RESCHEDULED]: 'Бронирование перенесено',
  [TriggerEvent.BOOKING_REMINDER]: 'Напоминание о встрече',
}

const CHAT_EVENT_LABELS: Record<string, string> = {
  // GetStream-sourced (native webhook types)
  [ChatEventType.CHANNEL_CREATED]: 'Канал создан',
  [ChatEventType.CHANNEL_DELETED]: 'Канал удалён',
  [ChatEventType.MESSAGE_NEW]: 'Новое сообщение',
  // booking-sourced (event-booking's own chat lifecycle events, EventType.CHAT_*)
  'chat.created': 'Чат создан',
  'chat.deleted': 'Чат удалён',
  'chat.message_sent': 'Сообщение отправлено',
}

const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
  organizer: 'Организатор',
  client: 'Клиент',
}

// Keyed by booking_video_events.video_event_type — the jitsi.* CloudEvent type
// with the `jitsi.` prefix stripped (dotted form, e.g. 'conference.joined').
const VIDEO_EVENT_LABELS: Record<string, string> = {
  'conference.joined': 'Присоединился к звонку',
  'conference.left': 'Вышел из звонка',
  'participant.joined': 'Участник присоединился',
  'participant.left': 'Участник вышел',
  'participant.muted': 'Изменение mute-статуса',
  'participant.menu_button_click': 'Действие в меню участника',
  'audio.mute_status_changed': 'Микрофон',
  'video.mute_status_changed': 'Камера',
  'speaker.dominant_changed': 'Смена активного спикера',
  'device.list_changed': 'Изменение списка устройств',
  'toolbar.button_clicked': 'Нажата кнопка панели',
  'camera.error': 'Ошибка камеры',
  'mic.error': 'Ошибка микрофона',
  'error.occurred': 'Ошибка конференции',
  'peer_connection.failure': 'Сбой соединения',
  'suspend.detected': 'Устройство приостановлено',
}

function fallback(value: unknown): string {
  if (value === null || value === undefined) {
    return 'Нет статуса'
  }

  if (typeof value === 'string') {
    return value.replaceAll('_', ' ')
  }

  return String(value)
}

export function getBookingStatusLabel(status: string | null | undefined): string {
  return (status != null ? BOOKING_STATUS_LABELS[status] : undefined) ?? fallback(status)
}

export function getNotificationStatusLabel(status: string | null | undefined): string {
  return (status != null ? NOTIFICATION_STATUS_LABELS[status] : undefined) ?? fallback(status)
}

export function isNotificationBounceStatus(status: string | null | undefined): boolean {
  return status === NotificationStatus.SOFT_BOUNCED || status === NotificationStatus.HARD_BOUNCED
}

export function getTriggerEventLabel(triggerEvent: string | null | undefined): string {
  return (triggerEvent != null ? TRIGGER_EVENT_LABELS[triggerEvent] : undefined) ?? fallback(triggerEvent)
}

export function getChatEventLabel(chatEventType: string | null | undefined): string {
  return (chatEventType != null ? CHAT_EVENT_LABELS[chatEventType] : undefined) ?? fallback(chatEventType)
}

export function getChatEventIcon(chatEventType: string | null | undefined): string {
  switch (chatEventType) {
    case ChatEventType.CHANNEL_CREATED:
    case 'chat.created':
      return '➕'
    case ChatEventType.CHANNEL_DELETED:
    case 'chat.deleted':
      return '➖'
    case ChatEventType.MESSAGE_NEW:
    case 'chat.message_sent':
      return '💬'
    default:
      return '•'
  }
}

export function getParticipantRoleLabel(role: string | null | undefined): string {
  return (role != null ? PARTICIPANT_ROLE_LABELS[role] : undefined) ?? fallback(role)
}

export function getVideoEventLabel(videoEventType: string | null | undefined): string {
  return (videoEventType != null ? VIDEO_EVENT_LABELS[videoEventType] : undefined) ?? fallback(videoEventType)
}

export const LifecycleAction = {
  CREATED: 'created',
  RESCHEDULED: 'rescheduled',
  REASSIGNED: 'reassigned',
  CANCELLED: 'cancelled',
} as const

const LIFECYCLE_ACTION_LABELS: Record<string, string> = {
  [LifecycleAction.CREATED]: 'Создано',
  [LifecycleAction.RESCHEDULED]: 'Перенесено',
  [LifecycleAction.REASSIGNED]: 'Переназначено',
  [LifecycleAction.CANCELLED]: 'Отменено',
}

export function getLifecycleActionLabel(action: string | null | undefined): string {
  return (action != null ? LIFECYCLE_ACTION_LABELS[action] : undefined) ?? fallback(action)
}

export function getLifecycleActionIcon(action: string | null | undefined): string {
  switch (action) {
    case LifecycleAction.CREATED:
      return '📋'
    case LifecycleAction.RESCHEDULED:
      return '🔄'
    case LifecycleAction.REASSIGNED:
      return '👤'
    case LifecycleAction.CANCELLED:
      return '❌'
    default:
      return '•'
  }
}

export const BOOKING_STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: BookingStatus.CREATED, label: getBookingStatusLabel(BookingStatus.CREATED) },
  { value: BookingStatus.CONFIRMED, label: getBookingStatusLabel(BookingStatus.CONFIRMED) },
  { value: BookingStatus.IN_PROGRESS, label: getBookingStatusLabel(BookingStatus.IN_PROGRESS) },
  { value: BookingStatus.RESCHEDULED, label: getBookingStatusLabel(BookingStatus.RESCHEDULED) },
  { value: BookingStatus.COMPLETED, label: getBookingStatusLabel(BookingStatus.COMPLETED) },
  { value: BookingStatus.CANCELLED, label: getBookingStatusLabel(BookingStatus.CANCELLED) },
]
