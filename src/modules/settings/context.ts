import { createContext } from 'react'

export type TimeZoneContextValue = {
  timeZone: string
  availableTimeZones: string[]
  setTimeZone: (timeZone: string) => void
}

export const TimeZoneContext = createContext<TimeZoneContextValue | null>(null)
