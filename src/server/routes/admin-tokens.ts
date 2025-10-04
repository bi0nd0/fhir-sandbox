import { Hono } from 'hono'

import type { AppEnv } from '../types'
import {
  deleteTokenById,
  deleteTokensByGrant,
  getTokenById,
  listTokens,
  type TokenSummary,
} from '../services/token-admin-service'

const REQUIRED_HEADER = 'x-admin-token'

const asTokenStatus = (value?: string) => {
  switch (value) {
    case 'active':
    case 'expired':
    case 'consumed':
    case 'all':
      return value
    default:
      return 'all'
  }
}

const adminToken = process.env.SANDBOX_ADMIN_TOKEN

const ensureAdminTokenConfigured = () => {
  if (!adminToken) {
    throw new Error('SANDBOX_ADMIN_TOKEN is not configured. Set it in your environment to enable admin APIs.')
  }
}

const authorize = (headerValue?: string) => {
  ensureAdminTokenConfigured()
  return Boolean(headerValue && headerValue === adminToken)
}

export const adminTokensRoute = new Hono<AppEnv>()

adminTokensRoute.use('*', async (c, next) => {
  const tokenHeader = c.req.header(REQUIRED_HEADER) ?? c.req.header('authorization')

  if (!authorize(tokenHeader)) {
    return c.json(
      {
        error: 'unauthorized',
        message: 'Provide a valid admin token via the x-admin-token header.',
      },
      401,
    )
  }

  await next()
})

adminTokensRoute.get('/', (c) => {
  const type = c.req.query('type') ?? undefined
  const status = asTokenStatus(c.req.query('status') ?? undefined)
  const limitParam = Number.parseInt(c.req.query('limit') ?? '', 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100

  const data = listTokens({ type, status, limit })

  return c.json<{ data: TokenSummary[]; meta: { count: number } }>({
    data,
    meta: { count: data.length },
  })
})

adminTokensRoute.get('/:id', (c) => {
  const token = getTokenById(c.req.param('id'))

  if (!token) {
    return c.json({ error: 'not_found', message: 'Token not found.' }, 404)
  }

  return c.json(token)
})

adminTokensRoute.delete('/:id', (c) => {
  const id = c.req.param('id')
  const cascade = c.req.query('cascade') === 'true'

  const token = getTokenById(id)
  if (!token) {
    return c.json({ error: 'not_found', message: 'Token not found.' }, 404)
  }

  let removed = 0
  if (cascade && token.grantId) {
    removed = deleteTokensByGrant(token.grantId)
  } else {
    removed = deleteTokenById(id)
  }

  return c.json({ removed, cascade, grantId: token.grantId ?? null })
})
