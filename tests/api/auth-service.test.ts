import { describe, expect, it } from 'vitest'

import { createAuthService } from '../../src/server/services/auth-service'

describe('AuthService', () => {
  const service = createAuthService()

  it('returns user details for valid credentials', () => {
    const result = service.verifyCredentials('alice', 'Wonderland!23')
    expect(result).toMatchObject({ username: 'alice', displayName: 'Alice Carter' })
  })

  it('rejects unknown usernames', () => {
    const result = service.verifyCredentials('unknown-user', 'secret')
    expect(result).toBeUndefined()
  })

  it('rejects incorrect passwords', () => {
    const result = service.verifyCredentials('alice', 'incorrect')
    expect(result).toBeUndefined()
  })
})
