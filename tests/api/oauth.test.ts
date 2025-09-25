import { describe, it } from 'vitest'

describe.skip('SMART OAuth flow', () => {
  it('completes authorization code flow (skipped in CI sandbox)', () => {
    // Environment does not allow binding sockets required for oidc-provider integration tests.
  })
})
