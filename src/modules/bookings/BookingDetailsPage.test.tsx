import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingDetailsPage } from './BookingDetailsPage.tsx'
import * as api from './bookingsApi.ts'
import type { BookingDetails } from './types.ts'

vi.mock('./bookingsApi.ts')

// Mock useTimeZone — the hook throws outside a provider
vi.mock('../settings/useTimeZone.ts', () => ({
  useTimeZone: () => ({ timeZone: 'UTC', availableTimeZones: [], setTimeZone: vi.fn() }),
}))

// Mock UserInfo to avoid the batch-loader network calls
vi.mock('../shared/UserInfo.tsx', () => ({
  UserInfo: ({ userId }: { userId?: string | null }) =>
    userId ? <span data-testid="user-info">{userId}</span> : <span>—</span>,
}))

// Mock EmailChangeModal — not under test here
vi.mock('../participants/EmailChangeModal.tsx', () => ({
  EmailChangeModal: () => null,
}))

// Mock userBatchLoader.getCachedUser used inside the change-email button handler
vi.mock('../shared/userBatchLoader.ts', () => ({
  getCachedUser: vi.fn(() => null),
  getUserCacheVersion: vi.fn(() => 0),
  hasCachedUser: vi.fn(() => false),
  loadUser: vi.fn(() => Promise.resolve(null)),
  subscribeToUserCache: vi.fn(() => () => {}),
  invalidateUser: vi.fn(),
  clearUserCache: vi.fn(),
}))

// navigateTo would call history.pushState — stub it out
vi.mock('../shared/routing.ts', () => ({
  navigateTo: vi.fn(),
}))

const FUTURE = new Date(Date.now() + 86_400_000).toISOString()
const PAST = new Date(Date.now() - 86_400_000).toISOString()

function details(overrides: Partial<BookingDetails> = {}): BookingDetails {
  return {
    id: 1,
    booking_uid: 'b1',
    start_time: FUTURE,
    end_time: FUTURE,
    current_status: 'created',
    created_at: FUTURE,
    current_organizer_participant: { user_id: 'org-1' },
    current_client_participant: { user_id: 'cli-1' },
    organizer_history: [],
    meeting_links: [],
    email_notifications: [],
    telegram_notifications: [],
    chat_events: [],
    video_events: [],
    lifecycle_events: [],
    ...overrides,
  } as BookingDetails
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.getBookingDetails).mockResolvedValue(details())
})

afterEach(() => {
  cleanup()
})

const reminderButton = () => screen.getByRole('button', { name: /Отправить напоминание клиенту/i })

describe('send client reminder', () => {
  it('enables and sends for an eligible booking', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    vi.mocked(api.sendClientReminder).mockResolvedValue({ status: 'accepted', email: 'cur@x.com' })
    render(<BookingDetailsPage bookingUid="b1" />)
    const btn = await waitFor(() => reminderButton())
    expect(btn).toBeEnabled()
    await userEvent.click(btn)
    await waitFor(() => expect(api.sendClientReminder).toHaveBeenCalledWith('b1'))
    expect(await screen.findByText(/cur@x\.com/)).toBeInTheDocument()
  })

  it('disables for a past booking', async () => {
    vi.mocked(api.getBookingDetails).mockResolvedValue(details({ start_time: PAST }))
    render(<BookingDetailsPage bookingUid="b1" />)
    expect(await waitFor(() => reminderButton())).toBeDisabled()
  })

  it('disables when the client has no account', async () => {
    vi.mocked(api.getBookingDetails).mockResolvedValue(details({ current_client_participant: { user_id: null } }))
    render(<BookingDetailsPage bookingUid="b1" />)
    expect(await waitFor(() => reminderButton())).toBeDisabled()
  })
})
