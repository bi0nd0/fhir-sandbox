export type HttpMethod = 'GET' | 'POST' | 'DELETE'

export type HttpRequestOptions = {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
}

const defaultHeaders: Record<string, string> = {
  Accept: 'application/json',
}

export const httpRequest = async <T>(url: string, options: HttpRequestOptions = {}): Promise<T> => {
  const headers = { ...defaultHeaders, ...(options.headers ?? {}) }
  let body: BodyInit | undefined

  if (options.body !== undefined) {
    if (headers['Content-Type'] === undefined) {
      headers['Content-Type'] = 'application/json'
    }

    body = headers['Content-Type'] === 'application/json' ? JSON.stringify(options.body) : (options.body as BodyInit)
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body,
    credentials: 'include',
  })

  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const json = (await response.json()) as Record<string, unknown>
      const message = typeof json.message === 'string' ? json.message : JSON.stringify(json)
      const error = new Error(message)
      ;(error as Error & { cause?: unknown }).cause = json
      throw error
    }

    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as unknown as T
}

export const buildUrl = (path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const url = new URL(path, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}
