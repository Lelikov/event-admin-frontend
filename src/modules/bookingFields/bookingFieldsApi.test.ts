import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../shared/api.ts', () => ({ apiRequest: vi.fn() }))
import { apiRequest } from '../shared/api.ts'
import { getBookingFields, listEventTypes, putBookingFields } from './bookingFieldsApi.ts'

describe('bookingFieldsApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists event types and unwraps items', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ items: [{ id: 'e1', slug: 's', title: 'T' }] })
    const res = await listEventTypes()
    expect(apiRequest).toHaveBeenCalledWith('/api/scheduling/event-types')
    expect(res).toEqual([{ id: 'e1', slug: 's', title: 'T' }])
  })

  it('gets booking fields, encoding the id', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ items: [] })
    await getBookingFields('e 1')
    expect(apiRequest).toHaveBeenCalledWith('/api/scheduling/event-types/e%201/booking-fields')
  })

  it('puts booking fields wrapped in an items body', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ items: [] })
    const items = [{ field_type: 'text' as const, label: 'Q' }]
    await putBookingFields('e1', items)
    expect(apiRequest).toHaveBeenCalledWith('/api/scheduling/event-types/e1/booking-fields', {
      method: 'PUT',
      body: { items },
    })
  })
})
