import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const TIME_ZONE_STORAGE_KEY = 'event_admin_time_zone'

type TimeZoneContextValue = {
  timeZone: string
  availableTimeZones: string[]
  setTimeZone: (timeZone: string) => void
}

const TimeZoneContext = createContext<TimeZoneContextValue | null>(null)

function getDefaultTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function getStoredTimeZone(): string {
  return localStorage.getItem(TIME_ZONE_STORAGE_KEY) ?? getDefaultTimeZone()
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

export function useTimeZone(): TimeZoneContextValue {
  const context = useContext(TimeZoneContext)
  if (!context) {
    throw new Error('useTimeZone must be used within TimeZoneProvider')
  }
  return context
}
