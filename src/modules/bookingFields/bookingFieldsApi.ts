import { apiRequest } from '../shared/api.ts'

export type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'boolean'

export interface FieldOption {
  value: string
  label: string
}

export interface BookingField {
  field_key: string
  field_type: FieldType
  label: string
  placeholder: string | null
  required: boolean
  options: FieldOption[]
  position: number
}

export interface EventTypeSummary {
  id: string
  slug: string
  title: string
}

export interface UpsertBookingField {
  field_type: FieldType
  label: string
  placeholder?: string | null
  required?: boolean
  options?: FieldOption[]
}

export async function listEventTypes(): Promise<EventTypeSummary[]> {
  const res = await apiRequest<{ items: EventTypeSummary[] }>('/api/scheduling/event-types')
  return res.items
}

export async function getBookingFields(eventTypeId: string): Promise<BookingField[]> {
  const res = await apiRequest<{ items: BookingField[] }>(
    `/api/scheduling/event-types/${encodeURIComponent(eventTypeId)}/booking-fields`,
  )
  return res.items
}

export async function putBookingFields(
  eventTypeId: string,
  items: UpsertBookingField[],
): Promise<BookingField[]> {
  const res = await apiRequest<{ items: BookingField[] }>(
    `/api/scheduling/event-types/${encodeURIComponent(eventTypeId)}/booking-fields`,
    { method: 'PUT', body: { items } },
  )
  return res.items
}
