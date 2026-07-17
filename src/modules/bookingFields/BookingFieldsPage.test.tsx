import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./bookingFieldsApi.ts', () => ({
  listEventTypes: vi.fn(),
  getBookingFields: vi.fn(),
  putBookingFields: vi.fn(),
}))
import { getBookingFields, listEventTypes } from './bookingFieldsApi.ts'
import { BookingFieldsPage } from './BookingFieldsPage.tsx'

let container: HTMLDivElement
let root: Root

function mount() {
  root = createRoot(container)
  act(() => {
    root.render(<BookingFieldsPage />)
  })
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function setNativeValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function labelInputs(): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[data-role="label"]'))
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  vi.mocked(listEventTypes).mockResolvedValue([{ id: 'e1', slug: 's', title: 'Тест' }])
  vi.mocked(getBookingFields).mockResolvedValue([
    { field_key: 'reason', field_type: 'text', label: 'Причина', placeholder: null, required: true, options: [], position: 0 },
  ])
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function selectFirstType() {
  const select = container.querySelector<HTMLSelectElement>('select[data-role="event-type"]')!
  await act(async () => {
    setNativeValue(select, 'e1')
    await Promise.resolve()
  })
  await flush()
}

describe('BookingFieldsPage', () => {
  it('lists event types after load', async () => {
    mount()
    await flush()
    const options = container.querySelectorAll('select[data-role="event-type"] option')
    expect(Array.from(options).some((o) => o.textContent === 'Тест')).toBe(true)
  })

  it('loads booking fields when a type is selected', async () => {
    mount()
    await flush()
    await selectFirstType()
    expect(vi.mocked(getBookingFields)).toHaveBeenCalledWith('e1')
    expect(labelInputs()[0].value).toBe('Причина')
  })

  it('adds and removes fields', async () => {
    mount()
    await flush()
    await selectFirstType()
    const addBtn = container.querySelector<HTMLButtonElement>('button[data-role="add-field"]')!
    await act(async () => {
      addBtn.click()
      await Promise.resolve()
    })
    expect(labelInputs()).toHaveLength(2)
    const removeBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Удалить поле"]')!
    await act(async () => {
      removeBtn.click()
      await Promise.resolve()
    })
    expect(labelInputs()).toHaveLength(1)
  })

  it('moves a field down, swapping order', async () => {
    vi.mocked(getBookingFields).mockResolvedValue([
      { field_key: 'a', field_type: 'text', label: 'Первое', placeholder: null, required: false, options: [], position: 0 },
      { field_key: 'b', field_type: 'text', label: 'Второе', placeholder: null, required: false, options: [], position: 1 },
    ])
    mount()
    await flush()
    await selectFirstType()
    expect(labelInputs().map((i) => i.value)).toEqual(['Первое', 'Второе'])
    const down = container.querySelector<HTMLButtonElement>('button[aria-label="Переместить вниз"]')!
    await act(async () => {
      down.click()
      await Promise.resolve()
    })
    expect(labelInputs().map((i) => i.value)).toEqual(['Второе', 'Первое'])
  })

  it('shows the options editor when switching to an option type', async () => {
    mount()
    await flush()
    await selectFirstType()
    const typeSelect = container.querySelector<HTMLSelectElement>('select[data-role="field-type"]')!
    await act(async () => {
      setNativeValue(typeSelect, 'select')
      await Promise.resolve()
    })
    expect(container.querySelector('input[aria-label="Вариант 1"]')).not.toBeNull()
  })
})
