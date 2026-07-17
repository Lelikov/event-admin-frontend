import { Icon, Switch } from 'events-design-system'
import type { FieldType } from './bookingFieldsApi.ts'
import { FIELD_TYPE_LABELS, isOptionType, type EditorField } from './fields.ts'

interface FieldRowProps {
  field: EditorField
  index: number
  count: number
  onChange: (patch: Partial<EditorField>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}

export function FieldRow({ field, index, count, onChange, onRemove, onMove }: FieldRowProps) {
  const optionType = isOptionType(field.fieldType)

  function changeType(next: FieldType) {
    if (!isOptionType(next)) {
      onChange({ fieldType: next, options: [] })
      return
    }
    onChange({ fieldType: next, options: field.options.length > 0 ? field.options : [''] })
  }

  function updateOption(i: number, value: string) {
    onChange({ options: field.options.map((o, idx) => (idx === i ? value : o)) })
  }

  function addOption() {
    onChange({ options: [...field.options, ''] })
  }

  function removeOption(i: number) {
    onChange({ options: field.options.filter((_, idx) => idx !== i) })
  }

  return (
    <article className="card booking-field-row">
      <div className="inline-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="Переместить вверх"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <Icon name="chevron-left" style={{ transform: 'rotate(90deg)' }} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Переместить вниз"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <Icon name="chevron-left" style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button type="button" className="icon-button" aria-label="Удалить поле" onClick={onRemove}>
          <Icon name="trash" />
        </button>
      </div>

      <label className="field">
        <span>Тип поля</span>
        <select
          data-role="field-type"
          value={field.fieldType}
          onChange={(e) => changeType(e.target.value as FieldType)}
        >
          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Вопрос</span>
        <input
          type="text"
          data-role="label"
          value={field.label}
          maxLength={200}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Подсказка (необязательно)</span>
        <input
          type="text"
          value={field.placeholder}
          maxLength={500}
          onChange={(e) => onChange({ placeholder: e.target.value })}
        />
      </label>

      <Switch
        checked={field.required}
        showState
        label="Обязательное поле"
        onChange={(v) => onChange({ required: v })}
      />

      {optionType && (
        <div className="booking-field-options">
          <span className="field-options-title">Варианты ответа</span>
          {field.options.map((opt, i) => (
            <div key={i} className="inline-actions">
              <input
                type="text"
                aria-label={`Вариант ${i + 1}`}
                value={opt}
                maxLength={200}
                onChange={(e) => updateOption(i, e.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Удалить вариант"
                disabled={field.options.length <= 1}
                onClick={() => removeOption(i)}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <button type="button" className="secondary small" onClick={addOption}>
            <Icon name="plus" size={14} /> Добавить вариант
          </button>
        </div>
      )}
    </article>
  )
}
