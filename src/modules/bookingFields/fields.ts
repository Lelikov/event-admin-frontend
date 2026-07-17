import type { BookingField, FieldType, UpsertBookingField } from './bookingFieldsApi.ts'

export interface EditorField {
  uid: number
  fieldType: FieldType
  label: string
  placeholder: string
  required: boolean
  options: string[]
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Текст',
  textarea: 'Многострочный текст',
  select: 'Список (выбор одного)',
  radio: 'Переключатели (выбор одного)',
  checkbox: 'Флажки (выбор нескольких)',
  boolean: 'Согласие (да/нет)',
}

const OPTION_TYPES: FieldType[] = ['select', 'radio', 'checkbox']

export function isOptionType(fieldType: FieldType): boolean {
  return OPTION_TYPES.includes(fieldType)
}

export function toEditorField(field: BookingField, uid: number): EditorField {
  return {
    uid,
    fieldType: field.field_type,
    label: field.label,
    placeholder: field.placeholder ?? '',
    required: field.required,
    options: field.options.map((o) => o.value),
  }
}

export function newEditorField(uid: number): EditorField {
  return { uid, fieldType: 'text', label: '', placeholder: '', required: false, options: [] }
}

export function validateFields(fields: EditorField[]): string | null {
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i]
    const pos = i + 1
    if (field.label.trim() === '') {
      return `Поле №${pos}: укажите вопрос`
    }
    if (!isOptionType(field.fieldType)) {
      continue
    }
    const values = field.options.map((o) => o.trim()).filter((o) => o !== '')
    if (values.length === 0) {
      return `Поле №${pos}: добавьте хотя бы один вариант`
    }
    if (new Set(values).size !== values.length) {
      return `Поле №${pos}: варианты не должны повторяться`
    }
  }
  return null
}

export function buildUpsertItems(fields: EditorField[]): UpsertBookingField[] {
  return fields.map((field) => {
    const placeholder = field.placeholder.trim() === '' ? null : field.placeholder.trim()
    const base = {
      field_type: field.fieldType,
      label: field.label.trim(),
      placeholder,
      required: field.required,
    }
    if (!isOptionType(field.fieldType)) {
      return base
    }
    const options = field.options
      .map((o) => o.trim())
      .filter((o) => o !== '')
      .map((o) => ({ value: o, label: o }))
    return { ...base, options }
  })
}
