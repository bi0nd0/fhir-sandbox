import { buildUrl, httpRequest } from './http'

export type InteractionContext = {
  uid: string
  clientId?: string
  clientName?: string
  redirectUri?: string
  scopes: string[]
}

export type LoginPayload = {
  username: string
  password: string
}

export const fetchInteractionContext = (uid: string) =>
  httpRequest<InteractionContext>(buildUrl(`/oauth2/api/interaction/${encodeURIComponent(uid)}`))

export const submitInteractionLogin = (uid: string, body: LoginPayload) =>
  httpRequest<{ status: 'ok'; redirectTo: string }>(buildUrl(`/oauth2/api/interaction/${encodeURIComponent(uid)}/login`), {
    method: 'POST',
    body,
  })

export const logoutSession = () =>
  httpRequest<{ status: 'logged-out' | 'no-active-session' }>(buildUrl('/oauth2/logout'), {
    method: 'POST',
  })
