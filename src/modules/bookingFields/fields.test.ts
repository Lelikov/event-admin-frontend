import { describe, expect, it } from 'vitest'
import type { EditorField } from './fields.ts'
import { buildUpsertItems, validateFields } from './fields.ts'

function mk(partial: Partial<EditorField>): EditorField {
  return { uid: 1, fieldType: 'text', label: 'Q', placeholder: '', required: false, options: [], ...partial }
}

describe('validateFields', () => {
  it('accepts an empty list', () => {
    expect(validateFields([])).toBeNull()
  })

  it('rejects a blank label', () => {
    expect(validateFields([mk({ label: '  ' })])).toMatch(/№1/)
  })

  it('rejects an option type with no non-empty options', () => {
    expect(validateFields([mk({ fieldType: 'select', options: ['', '  '] })])).toMatch(/вариант/i)
  })

  it('rejects duplicate option values', () => {
    expect(validateFields([mk({ fieldType: 'radio', options: ['a', 'a'] })])).toMatch(/повтор/i)
  })

  it('accepts a valid option field', () => {
    expect(validateFields([mk({ fieldType: 'checkbox', options: ['a', 'b'] })])).toBeNull()
  })
})

describe('buildUpsertItems', () => {
  it('maps a non-option field, trimming and nulling empty placeholder', () => {
    const items = buildUpsertItems([mk({ label: ' Reason ', placeholder: '  ', required: true })])
    expect(items).toEqual([{ field_type: 'text', label: 'Reason', placeholder: null, required: true }])
  })

  it('maps an option field to {value,label} pairs, dropping empties', () => {
    const items = buildUpsertItems([mk({ fieldType: 'select', label: 'Pick', options: [' a ', '', 'b'] })])
    expect(items).toEqual([
      {
        field_type: 'select',
        label: 'Pick',
        placeholder: null,
        required: false,
        options: [
          { value: 'a', label: 'a' },
          { value: 'b', label: 'b' },
        ],
      },
    ])
  })
})
