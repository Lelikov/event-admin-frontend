import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from './modules/app/AdminLayout.tsx'
import { LoginPage } from './modules/auth/LoginPage.tsx'
import { useAuth } from './modules/auth/useAuth.ts'
import { BookingDetailsPage } from './modules/bookings/BookingDetailsPage.tsx'
import { BookingsPage } from './modules/bookings/BookingsPage.tsx'
import { DashboardPage } from './modules/bookings/DashboardPage.tsx'
import { ParticipantsPage } from './modules/participants/ParticipantsPage.tsx'
import { BlacklistPage } from './modules/blacklist/BlacklistPage.tsx'
import { NotificationsPage } from './modules/notifications/NotificationsPage.tsx'
import { navigateTo, parseRoute } from './modules/shared/routing.ts'

function App() {
  const { isAuthenticated } = useAuth()
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', syncPath)
    window.addEventListener('app:navigate', syncPath)

    return () => {
      window.removeEventListener('popstate', syncPath)
      window.removeEventListener('app:navigate', syncPath)
    }
  }, [])

  const route = useMemo(() => parseRoute(pathname), [pathname])

  // Note: there is no client-side role gate. event-admin requires the admin
  // role on every data endpoint, so non-admin tokens cannot use the app at all.
  useEffect(() => {
    if (!isAuthenticated && route.name !== 'login') {
      navigateTo('/login', { replace: true })
      return
    }

    if (isAuthenticated && route.name === 'login') {
      navigateTo('/dashboard', { replace: true })
    }
  }, [isAuthenticated, route.name])

  if (route.name === 'login') {
    return <LoginPage />
  }

  return (
    <AdminLayout pathname={pathname}>
      {route.name === 'dashboard' && <DashboardPage />}
      {route.name === 'bookings' && <BookingsPage />}
      {route.name === 'booking-details' && (
        <BookingDetailsPage bookingUid={route.bookingUid} />
      )}
      {route.name === 'participants' && <ParticipantsPage />}
      {route.name === 'blacklist' && <BlacklistPage />}
      {route.name === 'notifications' && <NotificationsPage />}
      {route.name === 'not-found' && (
        <div className="card">
          <h2>Страница не найдена</h2>
          <p>
            Адрес <code>{pathname}</code> не существует.
          </p>
          <button type="button" onClick={() => navigateTo('/dashboard', { replace: true })}>
            Вернуться в дашборд
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

export default App
