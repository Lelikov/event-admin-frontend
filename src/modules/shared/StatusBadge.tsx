import {
  getBookingStatusLabel,
  getBookingStatusVariant,
} from '../bookings/statuses.ts'

type Props = {
  status: string | null | undefined
}

/**
 * Semantic, colour-coded booking-status pill. The colour is derived from the
 * status meaning (created / confirmed / in&nbsp;progress / completed / cancelled /
 * rescheduled), not a single brand tint, so a list of bookings is scannable at
 * a glance. See `.badge--<variant>` in index.css.
 */
export function StatusBadge({ status }: Props) {
  const variant = getBookingStatusVariant(status)
  return <span className={`badge badge--${variant}`}>{getBookingStatusLabel(status)}</span>
}
