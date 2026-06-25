type Props = {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  /** Accessible label; also used for the title tooltip. */
  label?: string
  /** Show a "Вкл / Выкл" text next to the track. */
  showState?: boolean
}

/**
 * Compact accessible toggle. Replaces bare checkboxes where a binary on/off is
 * really a state change (notification channel enabled, blacklist entry active).
 */
export function Switch({ checked, onChange, disabled = false, label, showState = false }: Props) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label ?? (checked ? 'Выключить' : 'Включить')}
      className={`switch${checked ? ' is-on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  )

  if (!showState) return button

  return (
    <span className="switch-field">
      <span className={`switch-state ${checked ? 'is-on' : 'is-off'}`}>{checked ? 'Вкл' : 'Выкл'}</span>
      {button}
    </span>
  )
}
