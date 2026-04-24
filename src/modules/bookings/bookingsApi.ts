import { apiRequest } from '../shared/api.ts'
import type {
  BookingDetails,
  BookingListItem,
  FutureEmailBouncedBooking,
} from './types.ts'

export type GetBookingsFilters = {
  booking_uids?: string[]
  current_statuses?: string[]
  current_organizer_user_ids?: string[]
  current_client_user_ids?: string[]
}

export function getBookings(filters?: GetBookingsFilters): Promise<BookingListItem[]> {
  const params = new URLSearchParams()

  filters?.booking_uids?.forEach((value) => params.append('booking_uids', value))
  filters?.current_statuses?.forEach((value) => params.append('current_statuses', value))
  filters?.current_organizer_user_ids?.forEach((value) =>
    params.append('current_organizer_user_ids', value),
  )
  filters?.current_client_user_ids?.forEach((value) =>
    params.append('current_client_user_ids', value),
  )

  const query = params.toString()
  const path = query ? `/bookings?${query}` : '/bookings'

  return apiRequest<BookingListItem[]>(path)
}

export function getBookingDetails(bookingUid: string): Promise<BookingDetails> {
  return apiRequest<BookingDetails>(`/bookings/${encodeURIComponent(bookingUid)}`)
}

export function getFutureEmailBouncedBookings(): Promise<FutureEmailBouncedBooking[]> {
  return apiRequest<FutureEmailBouncedBooking[]>('/bookings/future-email-bounced')
}
