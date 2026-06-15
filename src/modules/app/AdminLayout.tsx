import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { navigateTo } from '../shared/routing.ts'
import { useTimeZone } from '../settings/useTimeZone.ts'

type AdminLayoutProps = {
  pathname: string
  children: ReactNode
}

type NavItem = {
  label: string
  path: string
  match: (pathname: string) => boolean
}

// All pages require the admin role on the backend (event-admin attaches
// require_admin to every data endpoint), so the nav is not role-filtered.
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Дашборд',
    path: '/dashboard',
    match: (pathname) => pathname === '/' || pathname === '/dashboard',
  },
  {
    label: 'Бронирования',
    path: '/bookings',
    match: (pathname) => pathname === '/bookings' || pathname.startsWith('/bookings/'),
  },
  {
    label: 'Пользователи',
    path: '/participants',
    match: (pathname) => pathname === '/participants',
  },
  {
    label: 'Чёрный список',
    path: '/blacklist',
    match: (pathname) => pathname === '/blacklist',
  },
  {
    label: 'Уведомления',
    path: '/notifications',
    match: (pathname) => pathname === '/notifications',
  },
]

type TimeZonePickerProps = {
  timeZone: string
  availableTimeZones: string[]
  setTimeZone: (tz: string) => void
}

function TimeZonePicker({ timeZone, availableTimeZones, setTimeZone }: TimeZonePickerProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return availableTimeZones.filter((tz) => tz.toLowerCase().includes(q))
  }, [query, availableTimeZones])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleSelect(tz: string) {
    setTimeZone(tz)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div className="tz-picker" ref={containerRef}>
      <span className="tz-picker-label">Часовой пояс</span>
      <input
        className="tz-picker-input"
        type="text"
        value={isOpen ? query : timeZone}
        placeholder={isOpen ? timeZone : ''}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          setIsOpen(true)
          setQuery('')
        }}
        onBlur={() => {
          setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              setIsOpen(false)
              setQuery('')
            }
          }, 150)
        }}
      />
      {isOpen && (
        <div className="tz-dropdown">
          {filtered.length === 0 ? (
            <div className="tz-option-empty">Не найдено</div>
          ) : (
            filtered.map((tz) => (
              <div
                key={tz}
                className={`tz-option${tz === timeZone ? ' is-active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(tz)
                }}
              >
                {tz}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function AdminLayout({ pathname, children }: AdminLayoutProps) {
  const { logout } = useAuth()
  const { timeZone, availableTimeZones, setTimeZone } = useTimeZone()

  return (
    <div className="admin-shell">
      <aside className="sidebar card">
        <div>
          <p className="eyebrow">Event Admin</p>
          <h2>Панель управления</h2>
        </div>

        <nav className="menu">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname)
            return (
              <button
                key={item.path}
                type="button"
                className={active ? 'menu-item active' : 'menu-item'}
                onClick={() => navigateTo(item.path)}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <TimeZonePicker
          timeZone={timeZone}
          availableTimeZones={availableTimeZones}
          setTimeZone={setTimeZone}
        />

        <button
          type="button"
          className="secondary"
          onClick={async () => {
            await logout()
            navigateTo('/login', { replace: true })
          }}
        >
          Выйти
        </button>
      </aside>

      <main className="content">{children}</main>
    </div>
  )
}
