export type AppRoute =
  | { name: 'login' }
  | { name: 'dashboard' }
  | { name: 'bookings' }
  | { name: 'booking-details'; bookingUid: string }
  | { name: 'participants' }
  | { name: 'blacklist' }
  | { name: 'notifications' }
  | { name: 'not-found' }

export function parseRoute(pathname: string): AppRoute {
  if (pathname === '/login') {
    return { name: 'login' }
  }

  if (pathname === '/' || pathname === '/dashboard') {
    return { name: 'dashboard' }
  }

  if (pathname === '/bookings') {
    return { name: 'bookings' }
  }

  const bookingMatch = pathname.match(/^\/bookings\/([^/]+)$/)
  if (bookingMatch) {
    return { name: 'booking-details', bookingUid: decodeURIComponent(bookingMatch[1]) }
  }

  if (pathname === '/participants') {
    return { name: 'participants' }
  }

  if (pathname === '/blacklist') {
    return { name: 'blacklist' }
  }

  if (pathname === '/notifications') {
    return { name: 'notifications' }
  }

  return { name: 'not-found' }
}

export function navigateTo(path: string, options?: { replace?: boolean }): void {
  const method = options?.replace ? 'replaceState' : 'pushState'
  window.history[method](null, '', path)
  window.dispatchEvent(new Event('app:navigate'))
}
