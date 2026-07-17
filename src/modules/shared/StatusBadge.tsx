import { Badge, type BadgeVariant } from 'events-design-system'
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
 * a glance. See the `events-design-system` `Badge` component's `.badge--<variant>` styles.
 */
export function StatusBadge({ status }: Props) {
  return <Badge variant={getBookingStatusVariant(status) as BadgeVariant}>{getBookingStatusLabel(status)}</Badge>
}
