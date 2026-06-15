import { apiRequest } from '../shared/api.ts'

export type Binding = {
  trigger_event: string
  channel: string
  enabled: boolean
  unisender_template_id: string | null
  telegram_body: string | null
  updated_at: string
}

export type UnisenderTemplate = {
  id: string
  name: string
}

export type GetConfigResponse = {
  bindings: Binding[]
}

export type GetUnisenderTemplatesResponse = {
  templates: UnisenderTemplate[]
}

export type PutBindingBody = {
  enabled: boolean
  unisender_template_id?: string | null
  telegram_body?: string | null
}

export type PreviewTelegramResponse = {
  rendered: string
}

export async function getConfig(): Promise<GetConfigResponse> {
  return apiRequest<GetConfigResponse>('/api/notifications/config')
}

export async function putBinding(
  triggerEvent: string,
  channel: string,
  body: PutBindingBody,
): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(
    `/api/notifications/config/${encodeURIComponent(triggerEvent)}/${encodeURIComponent(channel)}`,
    { method: 'PUT', body },
  )
}

export async function getUnisenderTemplates(refresh = false): Promise<GetUnisenderTemplatesResponse> {
  const qs = refresh ? '?refresh=true' : ''
  return apiRequest<GetUnisenderTemplatesResponse>(`/api/notifications/unisender-templates${qs}`)
}

export async function previewTelegram(
  telegramBody: string,
  sampleData?: Record<string, unknown>,
): Promise<PreviewTelegramResponse> {
  return apiRequest<PreviewTelegramResponse>('/api/notifications/telegram/preview', {
    method: 'POST',
    body: { telegram_body: telegramBody, ...(sampleData ? { sample_data: sampleData } : {}) },
  })
}
