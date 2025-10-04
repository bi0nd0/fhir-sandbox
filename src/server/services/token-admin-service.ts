import { and, eq, gt, isNotNull, isNull, lt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import { sqlite } from '../db/connection'
import { oidcTokens } from '../db/oidc-schema'

const db = drizzle(sqlite, { schema: { oidcTokens } })

const now = () => Math.floor(Date.now() / 1000)

type TokenStatus = 'active' | 'expired' | 'consumed' | 'all'

type TokenFilter = {
  type?: string
  status?: TokenStatus
  limit?: number
}

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

const statusCondition = (status: TokenStatus) => {
  switch (status) {
    case 'expired':
      return lt(oidcTokens.expiresAt, now())
    case 'consumed':
      return isNotNull(oidcTokens.consumedAt)
    case 'active':
      return and(gt(oidcTokens.expiresAt, now()), isNull(oidcTokens.consumedAt))
    case 'all':
    default:
      return undefined
  }
}

const parsePayload = (raw: string): Record<string, unknown> => {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch (error) {
    return { parseError: (error as Error).message }
  }
}

export const listTokens = ({ type, status = 'all', limit = 100 }: TokenFilter): TokenSummary[] => {
  const conditions: unknown[] = []

  if (type) {
    conditions.push(eq(oidcTokens.type, type))
  }

  const statusClause = statusCondition(status)
  if (statusClause) {
    conditions.push(statusClause)
  }

  const whereClause = (() => {
    if (conditions.length === 0) {
      return undefined
    }

    if (conditions.length === 1) {
      return conditions[0]
    }

    return and(...(conditions as any[]))
  })()

  const rows = db
    .select()
    .from(oidcTokens)
    .where(whereClause)
    .orderBy(oidcTokens.expiresAt)
    .limit(limit)
    .all()

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    grantId: row.grantId,
    uid: row.uid,
    userCode: row.userCode,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    payload: parsePayload(row.payload),
  }))
}

export const getTokenById = (id: string): TokenSummary | undefined => {
  const row = db.select().from(oidcTokens).where(eq(oidcTokens.id, id)).get()

  if (!row) {
    return undefined
  }

  return {
    id: row.id,
    type: row.type,
    grantId: row.grantId,
    uid: row.uid,
    userCode: row.userCode,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    payload: parsePayload(row.payload),
  }
}

export const deleteTokenById = (id: string): number =>
  db.delete(oidcTokens).where(eq(oidcTokens.id, id)).run().changes

export const deleteTokensByGrant = (grantId: string): number =>
  db.delete(oidcTokens).where(eq(oidcTokens.grantId, grantId)).run().changes
