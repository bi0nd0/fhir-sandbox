import { eq, and, lt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import { sqlite } from '../db/connection'
import { oidcTokens } from '../db/oidc-schema'

const grantable = new Set([
  'AccessToken',
  'AuthorizationCode',
  'RefreshToken',
  'DeviceCode',
  'BackchannelAuthenticationRequest',
])

const now = () => Math.floor(Date.now() / 1000)

const ensureSchema = () => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS oidc_tokens (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      grant_id TEXT,
      user_code TEXT,
      uid TEXT,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER
    );
  `)

  sqlite.exec('CREATE INDEX IF NOT EXISTS oidc_tokens_grant_idx ON oidc_tokens (grant_id);')
  sqlite.exec('CREATE INDEX IF NOT EXISTS oidc_tokens_user_code_idx ON oidc_tokens (user_code);')
  sqlite.exec('CREATE INDEX IF NOT EXISTS oidc_tokens_uid_idx ON oidc_tokens (uid);')
  sqlite.exec('CREATE INDEX IF NOT EXISTS oidc_tokens_type_exp_idx ON oidc_tokens (type, expires_at);')
}

ensureSchema()

const db = drizzle(sqlite, { schema: { oidcTokens } })

const parsePayload = (record: { payload: string; consumedAt: number | null }) => {
  const parsed = JSON.parse(record.payload) as Record<string, unknown>
  if (record.consumedAt) {
    parsed.consumed = record.consumedAt
  }
  return parsed
}

const pruneExpired = async (type: string, id?: string): Promise<void> => {
  const baseCondition = and(eq(oidcTokens.type, type), lt(oidcTokens.expiresAt, now()))
  if (id) {
    await db.delete(oidcTokens).where(and(baseCondition, eq(oidcTokens.id, id)))
    return
  }

  await db.delete(oidcTokens).where(baseCondition)
}

export const createOidcAdapter = () =>
  class DrizzleAdapter {
    model: string

    constructor(model: string) {
      this.model = model
    }

    async upsert(id: string, payload: Record<string, unknown>, expiresIn?: number) {
      let expiration =
        typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? now() + expiresIn : undefined

      if ((!expiration || Number.isNaN(expiration)) && typeof payload.exp === 'number') {
        expiration = Number(payload.exp)
      }

      if (!expiration || Number.isNaN(expiration)) {
        expiration = now() + 60
      }

      const entry = {
        id,
        type: this.model,
        payload: JSON.stringify(payload),
        grantId: (payload.grantId as string | undefined) ?? null,
        userCode: (payload.userCode as string | undefined) ?? null,
        uid: (payload.uid as string | undefined) ?? null,
        expiresAt: Math.floor(expiration),
        consumedAt: (payload.consumed as number | undefined) ?? null,
      }

      await db
        .insert(oidcTokens)
        .values(entry)
        .onConflictDoUpdate({
          target: oidcTokens.id,
          set: entry,
        })
    }

    async find(id: string) {
      await pruneExpired(this.model, id)

      const record = db
        .select({ payload: oidcTokens.payload, consumedAt: oidcTokens.consumedAt })
        .from(oidcTokens)
        .where(and(eq(oidcTokens.type, this.model), eq(oidcTokens.id, id)))
        .get()

      if (!record) {
        return undefined
      }

      return parsePayload(record)
    }

    async findByUid(uid: string) {
      await pruneExpired(this.model)

      const record = db
        .select({ payload: oidcTokens.payload, consumedAt: oidcTokens.consumedAt })
        .from(oidcTokens)
        .where(and(eq(oidcTokens.type, this.model), eq(oidcTokens.uid, uid)))
        .get()

      if (!record) {
        return undefined
      }

      return parsePayload(record)
    }

    async findByUserCode(userCode: string) {
      await pruneExpired(this.model)

      const record = db
        .select({ payload: oidcTokens.payload, consumedAt: oidcTokens.consumedAt })
        .from(oidcTokens)
        .where(and(eq(oidcTokens.type, this.model), eq(oidcTokens.userCode, userCode)))
        .get()

      if (!record) {
        return undefined
      }

      return parsePayload(record)
    }

    async consume(id: string) {
      await db
        .update(oidcTokens)
        .set({ consumedAt: now() })
        .where(and(eq(oidcTokens.type, this.model), eq(oidcTokens.id, id)))
    }

    async destroy(id: string) {
      await db.delete(oidcTokens).where(and(eq(oidcTokens.type, this.model), eq(oidcTokens.id, id)))
    }

    async revokeByGrantId(grantId: string) {
      if (!grantable.has(this.model)) {
        return
      }

      await db.delete(oidcTokens).where(and(eq(oidcTokens.grantId, grantId), eq(oidcTokens.type, this.model)))
    }
  }
