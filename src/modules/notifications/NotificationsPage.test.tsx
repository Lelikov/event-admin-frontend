/**
 * NotificationsPage tests.
 *
 * Strategy: mock ./notificationsApi at the module level (vi.mock) so we never
 * hit the network, then mount the page into happy-dom and drive it via the DOM.
 * No external test-renderer library is needed — vitest + happy-dom is enough.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { NotificationsPage } from './NotificationsPage.tsx'
import type { Binding } from './notificationsApi.ts'

// ──────────────────────────────────────────────────────────────────────────────
// Module mock — must be at the top level so vitest can hoist it.
// ──────────────────────────────────────────────────────────────────────────────
vi.mock('./notificationsApi.ts', () => ({
  getConfig: vi.fn(),
  getUnisenderTemplates: vi.fn(),
  putBinding: vi.fn(),
  previewTelegram: vi.fn(),
}))

// Import the mocked functions *after* vi.mock so we get the spy references.
import {
  getConfig,
  getUnisenderTemplates,
  putBinding,
  previewTelegram,
} from './notificationsApi.ts'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const NOW = '2026-06-15T00:00:00Z'

function mkBinding(
  trigger: string,
  recipient_role: 'client' | 'organizer',
  channel: string,
  extra: Partial<Binding> = {},
): Binding {
  return {
    trigger_event: trigger,
    recipient_role,
    channel,
    enabled: true,
    unisender_template_id: null,
    telegram_body: null,
    updated_at: '2026-06-15T00:00:00',
    ...extra,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────
const FAKE_BINDINGS: Binding[] = [
  { trigger_event: 'BOOKING_CREATED', recipient_role: 'client', channel: 'email', enabled: true, unisender_template_id: 'tpl-1', telegram_body: null, updated_at: NOW },
  { trigger_event: 'BOOKING_CREATED', recipient_role: 'client', channel: 'telegram', enabled: true, unisender_template_id: null, telegram_body: 'Привет, {{ client_name }}!', updated_at: NOW },
  { trigger_event: 'BOOKING_RESCHEDULED', recipient_role: 'client', channel: 'email', enabled: false, unisender_template_id: null, telegram_body: null, updated_at: NOW },
  { trigger_event: 'BOOKING_RESCHEDULED', recipient_role: 'client', channel: 'telegram', enabled: false, unisender_template_id: null, telegram_body: '', updated_at: NOW },
  { trigger_event: 'BOOKING_REASSIGNED', recipient_role: 'client', channel: 'email', enabled: false, unisender_template_id: null, telegram_body: null, updated_at: NOW },
  { trigger_event: 'BOOKING_REASSIGNED', recipient_role: 'client', channel: 'telegram', enabled: false, unisender_template_id: null, telegram_body: '', updated_at: NOW },
  { trigger_event: 'BOOKING_CANCELLED', recipient_role: 'client', channel: 'email', enabled: false, unisender_template_id: null, telegram_body: null, updated_at: NOW },
  { trigger_event: 'BOOKING_CANCELLED', recipient_role: 'client', channel: 'telegram', enabled: false, unisender_template_id: null, telegram_body: '', updated_at: NOW },
  { trigger_event: 'BOOKING_REMINDER', recipient_role: 'client', channel: 'email', enabled: false, unisender_template_id: null, telegram_body: null, updated_at: NOW },
  { trigger_event: 'BOOKING_REMINDER', recipient_role: 'client', channel: 'telegram', enabled: false, unisender_template_id: null, telegram_body: '', updated_at: NOW },
  { trigger_event: 'BOOKING_REJECTED', recipient_role: 'client', channel: 'email', enabled: false, unisender_template_id: null, telegram_body: null, updated_at: NOW },
  { trigger_event: 'BOOKING_REJECTED', recipient_role: 'client', channel: 'telegram', enabled: false, unisender_template_id: null, telegram_body: '', updated_at: NOW },
  { trigger_event: 'BOOKING_REJECTED_BLACKLISTED', recipient_role: 'client', channel: 'email', enabled: false, unisender_template_id: null, telegram_body: null, updated_at: NOW },
  { trigger_event: 'BOOKING_REJECTED_BLACKLISTED', recipient_role: 'client', channel: 'telegram', enabled: false, unisender_template_id: null, telegram_body: '', updated_at: NOW },
]

const FAKE_TEMPLATES = [
  { id: 'tpl-1', name: 'Шаблон создания' },
  { id: 'tpl-2', name: 'Шаблон напоминания' },
]

// ──────────────────────────────────────────────────────────────────────────────
// DOM helpers
// ──────────────────────────────────────────────────────────────────────────────
let container: HTMLElement

function mount() {
  const root = createRoot(container)
  act(() => {
    root.render(<NotificationsPage />)
  })
  return root
}

async function flushAsync() {
  await act(async () => {
    await Promise.resolve()
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ──────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)

  vi.mocked(getConfig).mockResolvedValue({ bindings: FAKE_BINDINGS })
  vi.mocked(getUnisenderTemplates).mockResolvedValue({ templates: FAKE_TEMPLATES })
  vi.mocked(putBinding).mockResolvedValue({ status: 'ok' })
  vi.mocked(previewTelegram).mockResolvedValue({ rendered: 'Привет, Иван!' })
})

afterEach(() => {
  document.body.removeChild(container)
  vi.clearAllMocks()
})

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────
describe('NotificationsPage', () => {
  it('shows loading state then renders the 7 trigger rows', async () => {
    mount()
    // initial loading state
    expect(container.textContent).toContain('Загрузка')

    await flushAsync()

    // all 7 triggers should appear (by their Russian labels)
    expect(container.textContent).toContain('Бронирование создано')
    expect(container.textContent).toContain('Перенос')
    expect(container.textContent).toContain('Переназначение')
    expect(container.textContent).toContain('Отмена')
    expect(container.textContent).toContain('Напоминание')
    expect(container.textContent).toContain('Отклонено')
    expect(container.textContent).toContain('Отклонено (ЧС)')
  })

  it('renders the UniSender templates in selects', async () => {
    mount()
    await flushAsync()

    const options = container.querySelectorAll('select option')
    const optionTexts = Array.from(options).map((o) => o.textContent)
    expect(optionTexts).toContain('Шаблон создания')
    expect(optionTexts).toContain('Шаблон напоминания')
  })

  it('renders telegram bodies from the config', async () => {
    mount()
    await flushAsync()

    const textareas = container.querySelectorAll('textarea')
    const bodies = Array.from(textareas).map((t) => (t as HTMLTextAreaElement).value)
    expect(bodies).toContain('Привет, {{ client_name }}!')
  })

  it('calls putBinding twice (email + telegram) when Сохранить is clicked', async () => {
    mount()
    await flushAsync()

    // Find the first "Сохранить" button (BOOKING_CREATED row)
    const saveButtons = container.querySelectorAll<HTMLButtonElement>('button')
    const saveBtn = Array.from(saveButtons).find((b) => b.textContent?.includes('Сохранить'))
    expect(saveBtn).toBeDefined()

    await act(async () => {
      saveBtn!.click()
      await Promise.resolve()
    })

    expect(vi.mocked(putBinding)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(putBinding)).toHaveBeenCalledWith('BOOKING_CREATED', 'client', 'email', {
      enabled: true,
      unisender_template_id: 'tpl-1',
    })
    expect(vi.mocked(putBinding)).toHaveBeenCalledWith('BOOKING_CREATED', 'client', 'telegram', {
      enabled: true,
      telegram_body: 'Привет, {{ client_name }}!',
    })
  })

  it('shows "Сохранено" after a successful save', async () => {
    mount()
    await flushAsync()

    const saveButtons = container.querySelectorAll<HTMLButtonElement>('button')
    const saveBtn = Array.from(saveButtons).find((b) => b.textContent?.includes('Сохранить'))!

    await act(async () => {
      saveBtn.click()
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Сохранено')
  })

  it('clicking Предпросмотр calls previewTelegram and shows the rendered text', async () => {
    mount()
    await flushAsync()

    const previewButtons = container.querySelectorAll<HTMLButtonElement>('button')
    const previewBtn = Array.from(previewButtons).find((b) => b.textContent?.includes('Предпросмотр'))
    expect(previewBtn).toBeDefined()

    await act(async () => {
      previewBtn!.click()
      await Promise.resolve()
    })

    expect(vi.mocked(previewTelegram)).toHaveBeenCalledWith('Привет, {{ client_name }}!')
    expect(container.textContent).toContain('Привет, Иван!')
  })

  it('shows an error state when getConfig fails', async () => {
    vi.mocked(getConfig).mockRejectedValue(new Error('network error'))
    mount()
    await flushAsync()

    expect(container.textContent).toContain('Не удалось загрузить настройки уведомлений')
  })

  it('switches role tabs and saves with the active role', async () => {
    const putBindingMock = vi.mocked(putBinding)
    vi.mocked(getConfig).mockResolvedValue({
      bindings: [
        mkBinding('BOOKING_CREATED', 'client', 'email', { unisender_template_id: 'tmpl-client' }),
        mkBinding('BOOKING_CREATED', 'organizer', 'email', { unisender_template_id: 'tmpl-organizer' }),
        mkBinding('BOOKING_CREATED', 'client', 'telegram', { telegram_body: 'cli' }),
        mkBinding('BOOKING_CREATED', 'organizer', 'telegram', { telegram_body: 'org' }),
      ],
    })

    mount()
    await flushAsync()

    // default tab = client — 'cli' body should be visible
    const textareasBefore = Array.from(container.querySelectorAll<HTMLTextAreaElement>('textarea'))
    expect(textareasBefore.some((t) => t.value === 'cli')).toBe(true)

    // switch to organizer tab
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    const orgBtn = buttons.find((b) => b.textContent?.trim() === 'Волонтёр')
    expect(orgBtn).toBeDefined()

    await act(async () => {
      orgBtn!.click()
      await Promise.resolve()
    })

    // 'org' body should now be visible
    const textareasAfter = Array.from(container.querySelectorAll<HTMLTextAreaElement>('textarea'))
    expect(textareasAfter.some((t) => t.value === 'org')).toBe(true)

    // click the first save button
    const saveButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    const saveBtn = saveButtons.find((b) => b.textContent?.includes('Сохранить'))
    expect(saveBtn).toBeDefined()

    await act(async () => {
      saveBtn!.click()
      await Promise.resolve()
    })

    expect(putBindingMock).toHaveBeenCalledWith('BOOKING_CREATED', 'organizer', 'email', expect.anything())
  })
})
