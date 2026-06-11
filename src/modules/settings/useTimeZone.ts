import { useContext } from 'react'
import { TimeZoneContext, type TimeZoneContextValue } from './context.ts'

export function useTimeZone(): TimeZoneContextValue {
  const context = useContext(TimeZoneContext)
  if (!context) {
    throw new Error('useTimeZone must be used within TimeZoneProvider')
  }
  return context
}
