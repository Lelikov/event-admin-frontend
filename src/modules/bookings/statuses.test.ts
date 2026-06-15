import { describe, expect, it } from 'vitest'
import { getVideoEventLabel } from './statuses.ts'

describe('getVideoEventLabel', () => {
  // booking_video_events.video_event_type is the dotted jitsi.* type (prefix stripped).
  it('maps the dotted video_event_type values to Russian', () => {
    expect(getVideoEventLabel('conference.joined')).toBe('Присоединился к звонку')
    expect(getVideoEventLabel('participant.menu_button_click')).toBe('Действие в меню участника')
    expect(getVideoEventLabel('camera.error')).toBe('Ошибка камеры')
    expect(getVideoEventLabel('peer_connection.failure')).toBe('Сбой соединения')
    expect(getVideoEventLabel('suspend.detected')).toBe('Устройство приостановлено')
  })

  it('falls back to a readable form for unknown types', () => {
    expect(getVideoEventLabel('something_unknown')).toBe('something unknown')
    expect(getVideoEventLabel(null)).toBe('Нет статуса')
  })
})
