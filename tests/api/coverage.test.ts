import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/Coverage', () => {
  it('returns coverage bundle for a patient', async () => {
    const response = await app.request('/r4/Coverage?patient=123456')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(1)
  })

  it('rejects missing patient queries', async () => {
    const response = await app.request('/r4/Coverage')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })
})
