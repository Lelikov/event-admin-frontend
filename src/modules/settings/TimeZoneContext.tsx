import { useMemo, useState, type ReactNode } from 'react'
import { TimeZoneContext, type TimeZoneContextValue } from './context.ts'

const TIME_ZONE_STORAGE_KEY = 'event_admin_time_zone'

function getDefaultTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('ru-RU', { timeZone })
    return true
  } catch {
    return false
  }
}

function getStoredTimeZone(): string {
  const stored = localStorage.getItem(TIME_ZONE_STORAGE_KEY)
  if (stored && isValidTimeZone(stored)) {
    return stored
  }
  // A corrupt stored value would make Intl.DateTimeFormat throw on every
  // render; drop it and fall back to the browser default.
  if (stored) {
    localStorage.removeItem(TIME_ZONE_STORAGE_KEY)
  }
  return getDefaultTimeZone()
}

function getAvailableTimeZones(): string[] {
  const fallback = ['UTC', 'Europe/Moscow', 'Europe/Berlin', 'Asia/Almaty', 'America/New_York']

  if (typeof Intl.supportedValuesOf !== 'function') {
    return fallback
  }

  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return fallback
  }
}

type TimeZoneProviderProps = {
  children: ReactNode
}

export function TimeZoneProvider({ children }: TimeZoneProviderProps) {
  const [timeZone, setTimeZoneState] = useState<string>(() => getStoredTimeZone())

  const value = useMemo<TimeZoneContextValue>(
    () => ({
      timeZone,
      availableTimeZones: getAvailableTimeZones(),
      setTimeZone: (newTimeZone: string) => {
        localStorage.setItem(TIME_ZONE_STORAGE_KEY, newTimeZone)
        setTimeZoneState(newTimeZone)
      },
    }),
    [timeZone],
  )

  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>
}
