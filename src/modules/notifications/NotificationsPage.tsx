import { useEffect, useState } from 'react'
import { ApiError } from '../shared/api.ts'
import { Switch } from '../shared/Switch.tsx'
import { Icon } from '../shared/Icon.tsx'
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
          <p className="breadcrumb">Настройки <span className="sep">/</span> Уведомления</p>
          <h1>Уведомления</h1>
        </div>
      </header>

      {loading && <article className="card"><p>Загрузка…</p></article>}
      {loadError && <article className="card"><p className="error-text">{loadError}</p></article>}

      {!loading && !loadError && (
        <>
          <div className="notif-toolbar">
            <div className="seg" role="tablist">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="tab"
                  aria-selected={role === r.value}
                  className={role === r.value ? 'is-active' : ''}
                  onClick={() => setRole(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {templatesError && <span className="error-text" style={{ fontSize: '12px' }}>{templatesError}</span>}
              <button
                type="button"
                className="secondary small"
                onClick={() => void handleRefreshTemplates()}
                disabled={templatesLoading}
              >
                <Icon name="refresh" size={13} />
                {templatesLoading ? 'Обновление…' : 'Обновить шаблоны UniSender'}
              </button>
            </div>
          </div>

          <div className="notif-list">
            {TRIGGER_EVENTS.map((trigger) => {
              const row = rows[trigger]
              if (!row) return null
              return (
                <div className="notif-card" key={trigger}>
                  <div className="notif-card-head">
                    <div className="notif-title">
                      <h2>{TRIGGER_LABELS[trigger]}</h2>
                      <span className="notif-code">{trigger}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {row.saveOk && (
                        <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>Сохранено</span>
                      )}
                      {row.saveError && <span className="error-text" style={{ fontSize: '12px' }}>{row.saveError}</span>}
                      <button type="button" onClick={() => void handleSave(trigger)} disabled={row.saving}>
                        {row.saving ? 'Сохранение…' : 'Сохранить'}
                      </button>
                    </div>
                  </div>

                  <div className="channel-grid">
                    <div className="channel">
                      <div className="channel-head">
                        <span className="channel-name">
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.3" /><path d="m2 4 6 4.5L14 4" stroke="currentColor" strokeWidth="1.3" /></svg>
                          Email
                        </span>
                        <Switch
                          checked={row.emailEnabled}
                          showState
                          label="Email-уведомление"
                          onChange={(v) => updateRow(trigger, { emailEnabled: v })}
                        />
                      </div>
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

                    <div className="channel">
                      <div className="channel-head">
                        <span className="channel-name">
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M14 2 1.5 7l4 1.5M14 2l-2 11-4.5-4.5M14 2 7.5 8.5M5.5 8.5v3l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                          Telegram
                        </span>
                        <Switch
                          checked={row.telegramEnabled}
                          showState
                          label="Telegram-уведомление"
                          onChange={(v) => updateRow(trigger, { telegramEnabled: v })}
                        />
                      </div>
                      <label className="field" style={{ margin: 0 }}>
                        <span>Тело сообщения (Jinja2)</span>
                        <textarea
                          className="code-area"
                          rows={3}
                          value={row.telegramBody}
                          disabled={!row.telegramEnabled}
                          onChange={(e) => updateRow(trigger, { telegramBody: e.target.value, previewText: null, previewError: null })}
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
                      {row.previewText !== null && <div className="preview-box">{row.previewText}</div>}
                      {row.previewError && (
                        <p className="error-text" style={{ fontSize: '12px' }}>{row.previewError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
