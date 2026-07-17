import { useEffect, useRef, useState } from 'react'
import { Icon } from 'events-design-system'
import { ApiError } from '../shared/api.ts'
import { getBookingFields, listEventTypes, type EventTypeSummary } from './bookingFieldsApi.ts'
import { newEditorField, toEditorField, type EditorField } from './fields.ts'
import { FieldRow } from './FieldRow.tsx'

export function BookingFieldsPage() {
  const [eventTypes, setEventTypes] = useState<EventTypeSummary[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [fields, setFields] = useState<EditorField[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [fieldsError, setFieldsError] = useState<string | null>(null)
  const uidRef = useRef(0)

  function nextUid() {
    uidRef.current += 1
    return uidRef.current
  }

  useEffect(() => {
    async function loadTypes() {
      setLoading(true)
      setLoadError(null)
      try {
        setEventTypes(await listEventTypes())
      } catch (err) {
        setLoadError(err instanceof ApiError ? err.message : 'Не удалось загрузить типы встреч')
      } finally {
        setLoading(false)
      }
    }
    void loadTypes()
  }, [])

  async function selectEventType(id: string) {
    setSelectedId(id)
    setFields([])
    setFieldsError(null)
    if (id === '') {
      return
    }
    setFieldsLoading(true)
    try {
      const loaded = await getBookingFields(id)
      setFields(loaded.map((f) => toEditorField(f, nextUid())))
    } catch (err) {
      setFieldsError(err instanceof ApiError ? err.message : 'Не удалось загрузить поля')
    } finally {
      setFieldsLoading(false)
    }
  }

  function addField() {
    setFields((prev) => [...prev, newEditorField(nextUid())])
  }

  function removeField(uid: number) {
    setFields((prev) => prev.filter((f) => f.uid !== uid))
  }

  function moveField(uid: number, dir: -1 | 1) {
    setFields((prev) => {
      const index = prev.findIndex((f) => f.uid === uid)
      const target = index + dir
      if (index < 0 || target < 0 || target >= prev.length) {
        return prev
      }
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  function updateField(uid: number, patch: Partial<EditorField>) {
    setFields((prev) => prev.map((f) => (f.uid === uid ? { ...f, ...patch } : f)))
  }

  return (
    <section className="stack">
      <header className="page-header">
        <p className="breadcrumb">Настройки</p>
        <h1>Поля записи</h1>
      </header>

      {loading && (
        <article className="card">
          <p>Загрузка…</p>
        </article>
      )}
      {loadError && (
        <article className="card">
          <p className="error-text">{loadError}</p>
        </article>
      )}

      {!loading && !loadError && (
        <article className="card">
          <label className="field">
            <span>Тип встречи</span>
            <select
              data-role="event-type"
              value={selectedId}
              onChange={(e) => void selectEventType(e.target.value)}
            >
              <option value="">— выберите тип встречи —</option>
              {eventTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        </article>
      )}

      {fieldsError && <p className="error-text">{fieldsError}</p>}

      {selectedId !== '' && fieldsLoading && (
        <article className="card">
          <p>Загрузка полей…</p>
        </article>
      )}

      {selectedId !== '' && !fieldsLoading && (
        <>
          {fields.map((field, index) => (
            <FieldRow
              key={field.uid}
              field={field}
              index={index}
              count={fields.length}
              onChange={(patch) => updateField(field.uid, patch)}
              onRemove={() => removeField(field.uid)}
              onMove={(dir) => moveField(field.uid, dir)}
            />
          ))}
          <div className="inline-actions">
            <button type="button" data-role="add-field" className="secondary" onClick={addField}>
              <Icon name="plus" size={14} /> Добавить поле
            </button>
          </div>
        </>
      )}
    </section>
  )
}
