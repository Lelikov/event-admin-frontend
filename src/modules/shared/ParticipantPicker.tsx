import { useCallback, useEffect, useRef, useState } from 'react'
import { getParticipants } from '../participants/participantsApi.ts'
import type { ParticipantItem } from '../participants/participantsApi.ts'

export type PickedParticipant = { id: string; email: string; name?: string | null }

type ParticipantPickerProps = {
  label: string
  selected: PickedParticipant[]
  onChange: (selected: PickedParticipant[]) => void
  placeholder?: string
  roles?: string[]
}

export function ParticipantPicker({
  label,
  selected,
  onChange,
  placeholder = 'Поиск по email…',
  roles,
}: ParticipantPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ParticipantItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const roleFilter = roles?.[0]

  const fetchResults = useCallback(async (email: string) => {
    setIsLoading(true)
    try {
      const data = await getParticipants({
        ...(email ? { email } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
      })
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [roleFilter])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void fetchResults(value), 300)
  }

  function handleFocus() {
    if (!isOpen) {
      setIsOpen(true)
      void fetchResults(query)
    }
  }

  function handleInputBlur() {
    // Delay to allow onMouseDown on dropdown items to fire first
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false)
        setQuery('')
      }
    }, 200)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
      return
    }
    if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      onChange(selected.slice(0, -1))
    }
  }

  function toggleItem(p: ParticipantItem) {
    const isSelected = selected.some((s) => s.id === p.id)
    onChange(
      isSelected
        ? selected.filter((s) => s.id !== p.id)
        : [...selected, { id: p.id, email: p.email, name: p.name }],
    )
  }

  // Close on click outside
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

  // Cleanup debounce on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  return (
    <div className="field picker" ref={containerRef}>
      <span>{label}</span>
      <div
        className="picker-field"
        onClick={() => inputRef.current?.focus()}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selected.map((p) => (
          <span key={p.id} className="picker-chip">
            <span className="picker-chip-label">{p.name ?? p.email}</span>
            <button
              type="button"
              className="picker-chip-remove"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onChange(selected.filter((s) => s.id !== p.id))
              }}
              aria-label={`Удалить ${p.email}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="picker-search"
          placeholder={selected.length === 0 ? placeholder : ''}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
        />
      </div>

      {isOpen && (
        <div className="picker-dropdown" role="listbox">
          {isLoading ? (
            <div className="picker-dropdown-empty">Поиск…</div>
          ) : results.length === 0 ? (
            <div className="picker-dropdown-empty">Участники не найдены</div>
          ) : (
            results.map((p) => {
              const isSelected = selected.some((s) => s.id === p.id)
              return (
                <div
                  key={p.id}
                  className={`picker-dropdown-item${isSelected ? ' is-selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault() // keep input focused
                    toggleItem(p)
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="picker-dropdown-user">
                    <span className="picker-dropdown-name">{p.name ?? p.email}</span>
                    {p.name && <span className="picker-dropdown-email">{p.email}</span>}
                  </span>
                  {p.role && (
                    <span className="tag" style={{ fontSize: 11 }}>
                      {p.role}
                    </span>
                  )}
                  {isSelected && <span className="picker-check">✓</span>}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
