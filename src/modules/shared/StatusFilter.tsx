type StatusFilterProps = {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function StatusFilter({ label, options, selected, onChange }: StatusFilterProps) {
  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    )
  }

  return (
    <div className="field">
      <span>{label}</span>
      <div className="status-filter-options">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`status-option-btn${selected.includes(opt.value) ? ' is-active' : ''}`}
            onClick={() => toggle(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
