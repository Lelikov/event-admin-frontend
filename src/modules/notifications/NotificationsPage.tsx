import { useEffect, useState } from 'react'
import { ApiError } from '../shared/api.ts'
import {
  getConfig,
  getUnisenderTemplates,
  previewTelegram,
  putBinding,
  type Binding,
  type RecipientRole,
  type UnisenderTemplate,
} from './notificationsApi.ts'

const TRIGGER_EVENTS = [
  'BOOKING_CREATED',
  'BOOKING_RESCHEDULED',
  'BOOKING_REASSIGNED',
  'BOOKING_CANCELLED',
  'BOOKING_REMINDER',
  'BOOKING_REJECTED',
  'BOOKING_REJECTED_BLACKLISTED',
] as const

type TriggerEvent = (typeof TRIGGER_EVENTS)[number]

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  BOOKING_CREATED: 'Бронирование создано',
  BOOKING_RESCHEDULED: 'Перенос',
  BOOKING_REASSIGNED: 'Переназначение',
  BOOKING_CANCELLED: 'Отмена',
  BOOKING_REMINDER: 'Напоминание',
  BOOKING_REJECTED: 'Отклонено',
  BOOKING_REJECTED_BLACKLISTED: 'Отклонено (ЧС)',
}

const ROLES: { value: RecipientRole; label: string }[] = [
  { value: 'client', label: 'Клиент' },
  { value: 'organizer', label: 'Волонтёр' },
]

type RowState = {
  emailEnabled: boolean
  emailTemplateId: string
  telegramEnabled: boolean
  telegramBody: string
  saving: boolean
  saveError: string | null
  saveOk: boolean
  previewLoading: boolean
  previewText: string | null
  previewError: string | null
}

function bindingsToRowState(
  trigger: string,
  role: RecipientRole,
  bindings: Binding[],
): RowState {
  const email = bindings.find(
    (b) => b.trigger_event === trigger && b.recipient_role === role && b.channel === 'email',
  )
  const telegram = bindings.find(
    (b) => b.trigger_event === trigger && b.recipient_role === role && b.channel === 'telegram',
  )
  return {
    emailEnabled: email?.enabled ?? false,
    emailTemplateId: email?.unisender_template_id ?? '',
    telegramEnabled: telegram?.enabled ?? false,
    telegramBody: telegram?.telegram_body ?? '',
    saving: false,
    saveError: null,
    saveOk: false,
    previewLoading: false,
    previewText: null,
    previewError: null,
  }
}

export function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [role, setRole] = useState<RecipientRole>('client')
  const [allBindings, setAllBindings] = useState<Binding[]>([])
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [templates, setTemplates] = useState<UnisenderTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  function rebuildRows(bindings: Binding[], forRole: RecipientRole) {
    const initial: Record<string, RowState> = {}
    for (const trigger of TRIGGER_EVENTS) {
      initial[trigger] = bindingsToRowState(trigger, forRole, bindings)
    }
    setRows(initial)
  }

  async function loadData() {
    setLoading(true)
    setLoadError(null)
    try {
      const [configData, templatesData] = await Promise.all([getConfig(), getUnisenderTemplates()])
      setAllBindings(configData.bindings)
      rebuildRows(configData.bindings, role)
      setTemplates(templatesData.templates)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Не удалось загрузить настройки уведомлений')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (allBindings.length > 0) {
      rebuildRows(allBindings, role)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  function updateRow(trigger: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [trigger]: { ...prev[trigger], ...patch } }))
  }

  async function handleRefreshTemplates() {
    setTemplatesLoading(true)
    setTemplatesError(null)
    try {
      const data = await getUnisenderTemplates(true)
      setTemplates(data.templates)
    } catch (err) {
      setTemplatesError(err instanceof ApiError ? err.message : 'Не удалось обновить шаблоны')
    } finally {
      setTemplatesLoading(false)
    }
  }

  async function handleSave(trigger: string) {
    const row = rows[trigger]
    if (!row) return
    updateRow(trigger, { saving: true, saveError: null, saveOk: false })
    try {
      await putBinding(trigger, role, 'email', {
        enabled: row.emailEnabled,
        unisender_template_id: row.emailTemplateId || null,
      })
      await putBinding(trigger, role, 'telegram', {
        enabled: row.telegramEnabled,
        telegram_body: row.telegramBody || null,
      })
      const fresh = await getConfig()
      setAllBindings(fresh.bindings)
      updateRow(trigger, { saving: false, saveOk: true })
      setTimeout(() => updateRow(trigger, { saveOk: false }), 2000)
    } catch (err) {
      updateRow(trigger, {
        saving: false,
        saveError: err instanceof ApiError ? err.message : 'Не удалось сохранить',
      })
    }
  }

  async function handlePreview(trigger: string) {
    const row = rows[trigger]
    if (!row) return
    updateRow(trigger, { previewLoading: true, previewText: null, previewError: null })
    try {
      const result = await previewTelegram(row.telegramBody)
      updateRow(trigger, { previewLoading: false, previewText: result.rendered })
    } catch (err) {
      updateRow(trigger, {
        previewLoading: false,
        previewError: err instanceof ApiError ? err.message : 'Ошибка предпросмотра',
      })
    }
  }

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>Уведомления</h1>
        </div>
      </header>

      <article className="card">
        {loading && <p>Загрузка…</p>}
        {loadError && <p className="error-text">{loadError}</p>}

        {!loading && !loadError && (
          <>
            <div className="tabs" role="tablist" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="tab"
                  aria-selected={role === r.value}
                  className={role === r.value ? 'small' : 'secondary small'}
                  onClick={() => setRole(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="muted" style={{ fontSize: '12px' }}>
                Шаблоны UniSender
              </span>
              <button
                type="button"
                className="secondary small"
                onClick={() => void handleRefreshTemplates()}
                disabled={templatesLoading}
              >
                {templatesLoading ? 'Обновление…' : 'Обновить'}
              </button>
              {templatesError && <span className="error-text" style={{ fontSize: '12px' }}>{templatesError}</span>}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: '180px' }}>Событие</th>
                    <th style={{ minWidth: '260px' }}>Email</th>
                    <th style={{ minWidth: '320px' }}>Telegram</th>
                    <th style={{ minWidth: '100px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {TRIGGER_EVENTS.map((trigger) => {
                    const row = rows[trigger]
                    if (!row) return null
                    return (
                      <tr key={trigger}>
                        <td>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>
                            {TRIGGER_LABELS[trigger]}
                          </span>
                          <br />
                          <span className="muted" style={{ fontSize: '11px' }}>{trigger}</span>
                        </td>

                        <td>
                          <div style={{ display: 'grid', gap: '6px' }}>
                            <label className="checkbox-field" style={{ paddingBottom: 0 }}>
                              <input
                                type="checkbox"
                                checked={row.emailEnabled}
                                onChange={(e) => updateRow(trigger, { emailEnabled: e.target.checked })}
                              />
                              <span style={{ fontSize: '12px' }}>Включено</span>
                            </label>
                            <label className="field" style={{ margin: 0 }}>
                              <span>Шаблон UniSender</span>
                              <select
                                value={row.emailTemplateId}
                                onChange={(e) => updateRow(trigger, { emailTemplateId: e.target.value })}
                                disabled={!row.emailEnabled}
                              >
                                <option value="">— не выбран —</option>
                                {templates.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'grid', gap: '6px' }}>
                            <label className="checkbox-field" style={{ paddingBottom: 0 }}>
                              <input
                                type="checkbox"
                                checked={row.telegramEnabled}
                                onChange={(e) => updateRow(trigger, { telegramEnabled: e.target.checked })}
                              />
                              <span style={{ fontSize: '12px' }}>Включено</span>
                            </label>
                            <label className="field" style={{ margin: 0 }}>
                              <span>Тело сообщения (Jinja2)</span>
                              <textarea
                                value={row.telegramBody}
                                onChange={(e) => updateRow(trigger, { telegramBody: e.target.value, previewText: null, previewError: null })}
                                disabled={!row.telegramEnabled}
                                rows={3}
                                style={{
                                  width: '100%',
                                  background: 'var(--bg-soft)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--text)',
                                  padding: '9px 12px',
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  resize: 'vertical',
                                }}
                              />
                            </label>
                            <div className="inline-actions">
                              <button
                                type="button"
                                className="secondary small"
                                onClick={() => void handlePreview(trigger)}
                                disabled={row.previewLoading || !row.telegramBody}
                              >
                                {row.previewLoading ? 'Загрузка…' : 'Предпросмотр'}
                              </button>
                            </div>
                            {row.previewText !== null && (
                              <div
                                style={{
                                  background: 'var(--bg)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '8px 10px',
                                  fontSize: '12px',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {row.previewText}
                              </div>
                            )}
                            {row.previewError && (
                              <p className="error-text" style={{ fontSize: '12px' }}>{row.previewError}</p>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'grid', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => void handleSave(trigger)}
                              disabled={row.saving}
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              {row.saving ? 'Сохранение…' : 'Сохранить'}
                            </button>
                            {row.saveOk && (
                              <span style={{ fontSize: '12px', color: 'var(--success)' }}>Сохранено</span>
                            )}
                            {row.saveError && (
                              <p className="error-text" style={{ fontSize: '12px' }}>{row.saveError}</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  )
}
