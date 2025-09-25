import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/Condition', () => {
  it('returns conditions for a supported category', async () => {
    const response = await app.request('/r4/Condition?patient=123456&category=problem-list-item')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(1)
  })

  it('accepts patient references with resource prefix', async () => {
    const response = await app.request(
      '/r4/Condition?patient=Patient/123456&category=reason-for-visit',
    )

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(1)
  })

  it('rejects missing category queries', async () => {
    const response = await app.request('/r4/Condition?patient=123456')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })

  it('rejects unsupported categories', async () => {
    const response = await app.request('/r4/Condition?patient=123456&category=encounter-diagnosis')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })

  it('rejects invalid patient references', async () => {
    const response = await app.request('/r4/Condition?patient=Patient!123&category=problem-list-item')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })
})
