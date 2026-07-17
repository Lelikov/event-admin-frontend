import type { BookingField, FieldType } from './bookingFieldsApi.ts'

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
