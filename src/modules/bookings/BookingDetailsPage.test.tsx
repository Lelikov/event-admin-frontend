/**
 * BookingDetailsPage — send-client-reminder button tests.
 *
 * Strategy: mock ./bookingsApi at the module level, stub window.confirm, mount
 * into happy-dom via createRoot, and drive/assert through the DOM. No external
 * test-renderer library — vitest + happy-dom is enough (repo convention).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { BookingDetailsPage } from './BookingDetailsPage.tsx'
import type { BookingDetails } from './types.ts'

vi.mock('./bookingsApi.ts', () => ({
  getBookingDetails: vi.fn(),
  sendClientReminder: vi.fn(),
}))
vi.mock('../shared/UserInfo.tsx', () => ({ UserInfo: () => null }))
vi.mock('../participants/EmailChangeModal.tsx', () => ({ EmailChangeModal: () => null }))
vi.mock('../shared/userBatchLoader.ts', () => ({
  getCachedUser: vi.fn(() => null),
  getUserCacheVersion: vi.fn(() => 0),
  hasCachedUser: vi.fn(() => false),
  loadUser: vi.fn(() => Promise.resolve(null)),
  subscribeToUserCache: vi.fn(() => () => {}),
  invalidateUser: vi.fn(),
  clearUserCache: vi.fn(),
}))
vi.mock('../settings/useTimeZone.ts', () => ({
  useTimeZone: () => ({ timeZone: 'UTC', availableTimeZones: [], setTimeZone: vi.fn() }),
}))
vi.mock('../shared/routing.ts', () => ({ navigateTo: vi.fn() }))

import { getBookingDetails, sendClientReminder } from './bookingsApi.ts'

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

let container: HTMLElement
let root: Root

function mount() {
  root = createRoot(container)
  act(() => {
    root.render(<BookingDetailsPage bookingUid="b1" />)
  })
}

async function flushAsync() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function reminderButton(): HTMLButtonElement | null {
  const buttons = Array.from(container.querySelectorAll('button'))
  return (buttons.find((b) => b.textContent?.includes('Отправить напоминание')) as HTMLButtonElement) ?? null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  vi.mocked(getBookingDetails).mockResolvedValue(details())
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  act(() => root.unmount())
  document.body.removeChild(container)
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('send client reminder', () => {
  it('enables and sends for an eligible booking', async () => {
    vi.mocked(sendClientReminder).mockResolvedValue({ status: 'accepted', email: 'cur@x.com' })
    mount()
    await flushAsync()
    const btn = reminderButton()
    expect(btn).not.toBeNull()
    expect(btn!.disabled).toBe(false)
    act(() => {
      btn!.click()
    })
    await flushAsync()
    expect(vi.mocked(sendClientReminder)).toHaveBeenCalledWith('b1')
    expect(container.textContent).toContain('cur@x.com')
  })

  it('disables for a past booking', async () => {
    vi.mocked(getBookingDetails).mockResolvedValue(details({ start_time: PAST }))
    mount()
    await flushAsync()
    expect(reminderButton()!.disabled).toBe(true)
  })

  it('hides the button when the client has no account', async () => {
    vi.mocked(getBookingDetails).mockResolvedValue(details({ current_client_participant: { user_id: null } }))
    mount()
    await flushAsync()
    expect(reminderButton()).toBeNull()
  })
})
