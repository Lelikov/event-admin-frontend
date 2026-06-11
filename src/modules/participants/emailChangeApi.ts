import { apiRequest } from '../shared/api.ts'

export type EmailChangelogEntry = {
  id: string
  old_email: string
  new_email: string
  changed_by: string
  changed_at: string
}

export type EmailChangelogResponse = {
  items: EmailChangelogEntry[]
  total: number
}

export async function reassignBookingClient(bookingUid: string, newClientEmail: string): Promise<void> {
  await apiRequest(`/bookings/${encodeURIComponent(bookingUid)}/reassign-client`, {
    method: 'POST',
    body: { new_client_email: newClientEmail },
  })
}

export async function requestEmailChange(userId: string, newEmail: string): Promise<void> {
  await apiRequest(`/api/users/id/${userId}/change-email`, {
    method: 'POST',
    body: { new_email: newEmail },
  })
}

export async function getEmailChangelog(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<EmailChangelogResponse> {
  return apiRequest<EmailChangelogResponse>(
    `/api/users/id/${userId}/email-changelog?limit=${limit}&offset=${offset}`,
  )
}
