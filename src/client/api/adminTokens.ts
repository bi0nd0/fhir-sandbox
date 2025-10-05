import { buildUrl, httpRequest } from './http'

export type TokenStatus = 'active' | 'expired' | 'consumed' | 'all'

export type TokenSummary = {
  id: string
  type: string
  grantId: string | null
  uid: string | null
  userCode: string | null
  expiresAt: number
  consumedAt: number | null
  payload: Record<string, unknown>
}

export type TokenListResponse = {
  data: TokenSummary[]
  meta: { count: number }
}

const adminHeaders = (token: string) => ({
  'x-admin-token': token,
})

export const fetchTokens = (adminToken: string, params: { type?: string; status?: TokenStatus; limit?: number }) =>
  httpRequest<TokenListResponse>(
    buildUrl('/admin/tokens', {
      type: params.type,
      status: params.status,
      limit: params.limit,
    }),
    {
      headers: adminHeaders(adminToken),
    },
  )

export const deleteToken = (adminToken: string, id: string, cascade = false) =>
  httpRequest<{ removed: number; cascade: boolean; grantId: string | null }>(
    buildUrl(`/admin/tokens/${encodeURIComponent(id)}`, { cascade }),
    {
      method: 'DELETE',
      headers: adminHeaders(adminToken),
    },
  )
