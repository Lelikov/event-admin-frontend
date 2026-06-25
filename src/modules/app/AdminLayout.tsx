import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { decodeJwtPayload } from '../auth/jwt.ts'
import { navigateTo } from '../shared/routing.ts'
import { useTimeZone } from '../settings/useTimeZone.ts'
import { Icon, type IconName } from '../shared/Icon.tsx'

type AdminLayoutProps = {
  pathname: string
  children: ReactNode
}

type NavGroup = 'Обзор' | 'Данные' | 'Настройки'

type NavItem = {
  label: string
  path: string
  icon: IconName
  group: NavGroup
  match: (pathname: string) => boolean
}

const NAV_GROUPS: NavGroup[] = ['Обзор', 'Данные', 'Настройки']

// All pages require the admin role on the backend (event-admin attaches
// require_admin to every data endpoint), so the nav is not role-filtered.
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Дашборд',
    path: '/dashboard',
    icon: 'dashboard',
    group: 'Обзор',
    match: (pathname) => pathname === '/' || pathname === '/dashboard',
  },
  {
    label: 'Бронирования',
    path: '/bookings',
    icon: 'bookings',
    group: 'Данные',
    match: (pathname) => pathname === '/bookings' || pathname.startsWith('/bookings/'),
  },
  {
    label: 'Пользователи',
    path: '/participants',
    icon: 'users',
    group: 'Данные',
    match: (pathname) => pathname === '/participants',
  },
  {
    label: 'Чёрный список',
    path: '/blacklist',
    icon: 'blacklist',
    group: 'Данные',
    match: (pathname) => pathname === '/blacklist',
  },
  {
    label: 'Уведомления',
    path: '/notifications',
    icon: 'notifications',
    group: 'Настройки',
    match: (pathname) => pathname === '/notifications',
  },
]

function sidebarIdentity(jwtToken: string | null): { name: string; email: string | null; initials: string } {
  const sub = jwtToken ? decodeJwtPayload(jwtToken)?.sub ?? null : null
  const email = sub && sub.includes('@') ? sub : null
  const name = email ? email.split('@')[0] : sub ?? 'Администратор'
  const initials = name.slice(0, 2).toUpperCase()
  return { name, email, initials }
}

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
  const { logout, jwtToken } = useAuth()
  const { timeZone, availableTimeZones, setTimeZone } = useTimeZone()
  const identity = sidebarIdentity(jwtToken)

  async function handleLogout() {
    await logout()
    navigateTo('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <div className="app-logo">EA</div>
          <div>
            <div className="app-brand-name">Event Admin</div>
            <div className="app-brand-sub">Панель управления</div>
          </div>
        </div>

        <div className="app-search" role="search">
          <Icon name="search" size={15} />
          <span>Поиск…</span>
          <kbd>⌘K</kbd>
        </div>

        <nav className="app-nav">
          {NAV_GROUPS.map((group) => (
            <Fragment key={group}>
              <div className="app-nav-group">{group}</div>
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                const active = item.match(pathname)
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`app-nav-item${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => navigateTo(item.path)}
                  >
                    <span className="app-nav-icon">
                      <Icon name={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </Fragment>
          ))}
        </nav>

        <TimeZonePicker
          timeZone={timeZone}
          availableTimeZones={availableTimeZones}
          setTimeZone={setTimeZone}
        />

        <div className="app-user">
          <div className="app-user-avatar">{identity.initials}</div>
          <div className="app-user-meta">
            <div className="app-user-name">{identity.name}</div>
            {identity.email && <div className="app-user-email">{identity.email}</div>}
          </div>
          <button type="button" className="app-logout" title="Выйти" aria-label="Выйти" onClick={handleLogout}>
            <Icon name="logout" size={15} />
          </button>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  )
}
