import type { ReactElement, SVGProps } from 'react'

export type IconName =
  | 'dashboard'
  | 'bookings'
  | 'users'
  | 'blacklist'
  | 'notifications'
  | 'search'
  | 'clock'
  | 'logout'
  | 'refresh'
  | 'download'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'chevron-left'

const PATHS: Record<IconName, ReactElement> = {
  dashboard: (
    <>
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.8" />
      <rect x="10.5" y="1.5" width="6" height="6" rx="1.8" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.8" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.8" />
    </>
  ),
  bookings: (
    <>
      <rect x="2" y="3.5" width="14" height="12.5" rx="2.2" />
      <line x1="2" y1="7.2" x2="16" y2="7.2" />
      <line x1="6" y1="1.6" x2="6" y2="4.4" strokeLinecap="round" />
      <line x1="12" y1="1.6" x2="12" y2="4.4" strokeLinecap="round" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="6" r="3.1" />
      <path d="M3.5 15.5c0-3.1 2.6-4.7 5.5-4.7s5.5 1.6 5.5 4.7" strokeLinecap="round" />
    </>
  ),
  blacklist: (
    <>
      <circle cx="9" cy="9" r="6.6" />
      <line x1="4.4" y1="4.4" x2="13.6" y2="13.6" strokeLinecap="round" />
    </>
  ),
  notifications: (
    <>
      <circle cx="9" cy="9" r="6.6" />
      <circle cx="9" cy="9" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="5" />
      <line x1="11" y1="11" x2="14.5" y2="14.5" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M9 5v4l2.6 1.6" strokeLinecap="round" />
    </>
  ),
  logout: (
    <path
      d="M6.5 2.5H3.5v13H6.5M11 12l3.5-3.5L11 5M14.5 8.5H7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  refresh: (
    <path
      d="M15 9a6 6 0 1 1-1.8-4.3M15 2v3.5h-3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  download: (
    <path d="M9 2.5v8.5m0 0L5.5 7.5M9 11l3.5-3.5M3.5 14.5h11" strokeLinecap="round" strokeLinejoin="round" />
  ),
  plus: <path d="M9 3.5v11M3.5 9h11" strokeLinecap="round" />,
  edit: (
    <path d="M12 2.5 15.5 6 6 15.5l-4 .5.5-4L12 2.5Z" strokeLinejoin="round" />
  ),
  trash: (
    <path d="M3 4.5h12M7 4V2.5h4V4M5.5 4.5l.5 11h6l.5-11" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'chevron-left': <path d="M11 3.5 6 9l5 5.5" strokeLinecap="round" strokeLinejoin="round" />,
}

type Props = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
}

export function Icon({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
