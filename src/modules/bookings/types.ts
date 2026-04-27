export type Participant = {
  user_id: string | null
}

export type BookingListItem = {
  id: number
  booking_uid: string
  first_seen_at: string
  last_seen_at: string
  start_time: string | null
  end_time: string | null
  current_status: string | null
  created_at: string
  updated_at: string
  organizer_participant: Participant | null
  client_participant: Participant | null
}

export type FutureEmailBouncedBooking = {
  id: number
  booking_uid: string
  start_date: string
  end_time: string | null
  current_status: string | null
  organizer_participant: Participant | null
  client_participant: Participant | null
  email_bounce_statuses: string[]
}

export type OrganizerHistoryEntry = {
  id: number
  organizer_participant: Participant
  effective_from: string
}

export type MeetingLink = {
  id: number
  participant: Participant
  meeting_url: string
  created_at: string
}

export type NotificationStatusHistoryEntry = {
  id: number
  status: string | null
  clicked_url: string | null
  created_at: string
}

export type EmailNotification = {
  id: number
  participant: Participant | null
  recipient_email: string | null
  trigger_event: string | null
  sent_at: string | null
  last_status: string | null
  status_history: NotificationStatusHistoryEntry[]
}

export type TelegramNotification = {
  id: number
  participant: Participant | null
  recipient_email: string | null
  trigger_event: string | null
  source_event_id: string
  sent_at: string
  created_at: string
}

export type ChatEvent = {
  id: number
  chat_event_type: string
  participant: Participant | null
  is_read: boolean | null
  text_preview: string | null
  occurred_at: string
  updated_at: string
}

export type VideoEvent = {
  id: number
  raw_event_id: string
  video_event_type: string
  participant_role: string | null
  participant: Participant | null
  event_time: string | null
  payload: Record<string, unknown>
}

export type LifecycleEvent = {
  id: number
  action: string
  organizer_participant: Participant | null
  client_participant: Participant | null
  details: Record<string, unknown> | null
  occurred_at: string
}

export type BookingDetails = {
  id: number
  booking_uid: string
  start_time: string | null
  end_time: string | null
  current_status: string | null
  created_at: string
  current_organizer_participant: Participant | null
  current_client_participant: Participant | null
  organizer_history: OrganizerHistoryEntry[]
  meeting_links: MeetingLink[]
  email_notifications: EmailNotification[]
  telegram_notifications: TelegramNotification[]
  chat_events: ChatEvent[]
  video_events: VideoEvent[]
  lifecycle_events: LifecycleEvent[]
}
