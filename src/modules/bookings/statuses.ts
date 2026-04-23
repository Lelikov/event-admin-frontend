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
  SOFT_BOUNCED: 'soft_bounced',
  HARD_BOUNCED: 'hard_bounced',
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
  [ChatEventType.CHANNEL_CREATED]: 'Канал создан',
  [ChatEventType.CHANNEL_DELETED]: 'Канал удалён',
  [ChatEventType.MESSAGE_NEW]: 'Новое сообщение',
}

const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
  organizer: 'Организатор',
  client: 'Клиент',
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
      return '➕'
    case ChatEventType.CHANNEL_DELETED:
      return '➖'
    case ChatEventType.MESSAGE_NEW:
      return '💬'
    default:
      return '•'
  }
}

export function getParticipantRoleLabel(role: string | null | undefined): string {
  return (role != null ? PARTICIPANT_ROLE_LABELS[role] : undefined) ?? fallback(role)
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
      return '+'
    case LifecycleAction.RESCHEDULED:
      return '🔄'
    case LifecycleAction.REASSIGNED:
      return '👤'
    case LifecycleAction.CANCELLED:
      return '✕'
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
