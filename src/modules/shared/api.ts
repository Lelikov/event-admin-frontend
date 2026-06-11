import { getJwtToken, removeJwtToken } from '../auth/storage.ts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

if (!import.meta.env.DEV && !API_BASE_URL) {
  console.warn(
    'VITE_API_BASE_URL is empty: API requests will be sent relative to the static host. ' +
      'Set VITE_API_BASE_URL at build time unless the SPA is served behind the same origin as event-admin.',
  )
}

export class ApiError extends Error {
  status: number
  details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
  baseUrl?: string
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, baseUrl = API_BASE_URL } = options
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let tokenAttached = false
  if (auth) {
    const token = getJwtToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
      tokenAttached = true
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return null as T
  }

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'detail' in payload
        ? String(payload.detail)
        : `Ошибка запроса (${response.status})`
    const error = new ApiError(message, response.status, payload)
    // A 401 on a request that carried a token means the JWT is expired or
    // revoked (event-admin tokens live 60 minutes): clear the session and
    // force a re-login. Requests without a token (e.g. POST /auth/login
    // itself) must NOT redirect, otherwise the login error is never shown.
    if (error.status === 401 && tokenAttached) {
      removeJwtToken()
      window.location.href = '/login'
    }
    throw error
  }

  return payload as T
}
