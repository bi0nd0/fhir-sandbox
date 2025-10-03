import { beforeEach, describe, expect, it } from 'vitest'

import { createOidcAdapter } from '../../src/server/services/oidc-adapter'
import { sqlite } from '../../src/server/db/connection'

const Adapter = createOidcAdapter()

const clearStore = () => {
  sqlite.exec('DELETE FROM oidc_tokens;')
}

describe('Drizzle OIDC adapter', () => {
  beforeEach(() => {
    clearStore()
  })

  it('persists and retrieves refresh tokens', async () => {
    const adapter = new Adapter('RefreshToken')
    const issuedAt = Math.floor(Date.now() / 1000)
    const payload = {
      jti: 'refresh-1',
      grantId: 'grant-123',
      accountId: 'user-alice',
      clientId: 'example-client',
      iat: issuedAt,
      exp: issuedAt + 30,
      scope: 'openid offline_access',
    }

    await adapter.upsert('refresh-1', payload, 30)

    const record = (await adapter.find('refresh-1')) as Record<string, unknown> | undefined
    expect(record).toBeDefined()
    expect(record?.grantId).toBe('grant-123')
    expect(record?.accountId).toBe('user-alice')
  })

  it('marks tokens as consumed', async () => {
    const adapter = new Adapter('AuthorizationCode')
    await adapter.upsert('code-1', { jti: 'code-1', grantId: 'grant-abc' }, 60)

    await adapter.consume('code-1')
    const record = (await adapter.find('code-1')) as Record<string, unknown> | undefined
    expect(typeof record?.consumed).toBe('number')
  })

  it('drops expired entries on access', async () => {
    const adapter = new Adapter('AccessToken')
    await adapter.upsert('access-1', { jti: 'access-1' }, 1)

    // simulate expiry
    sqlite.exec('UPDATE oidc_tokens SET expires_at = expires_at - 120 WHERE id = "access-1";')

    const record = await adapter.find('access-1')
    expect(record).toBeUndefined()
  })

  it('revokeByGrantId removes all grant-bound artifacts', async () => {
    const rtAdapter = new Adapter('RefreshToken')
    const atAdapter = new Adapter('AccessToken')

    await rtAdapter.upsert('refresh-2', { jti: 'refresh-2', grantId: 'grant-Z' }, 120)
    await atAdapter.upsert('access-2', { jti: 'access-2', grantId: 'grant-Z' }, 60)

    await rtAdapter.revokeByGrantId('grant-Z')
    await atAdapter.revokeByGrantId('grant-Z')

    expect(await rtAdapter.find('refresh-2')).toBeUndefined()
    expect(await atAdapter.find('access-2')).toBeUndefined()
  })

  it('locates sessions by uid', async () => {
    const adapter = new Adapter('Session')
    await adapter.upsert('session-1', { uid: 'uid-1', accountId: 'user-bob' }, 600)

    const record = (await adapter.findByUid('uid-1')) as Record<string, unknown> | undefined
    expect(record?.accountId).toBe('user-bob')
  })
})
