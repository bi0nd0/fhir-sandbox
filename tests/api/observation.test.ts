import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/Observation', () => {
  it('returns observations for a supported category', async () => {
    const response = await app.request('/r4/Observation?patient=123456&category=vital-signs')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(2)
  })

  it('accepts patient references with resource prefix', async () => {
    const response = await app.request(
      '/r4/Observation?patient=Patient/123456&category=vital-signs',
    )

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(2)
  })

  it('rejects missing category queries', async () => {
    const response = await app.request('/r4/Observation?patient=123456')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })

  it('rejects missing patient queries', async () => {
    const response = await app.request('/r4/Observation?category=vital-signs')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })

  it('rejects unsupported categories', async () => {
    const response = await app.request('/r4/Observation?patient=123456&category=genomics')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })

  it('rejects invalid patient references', async () => {
    const response = await app.request('/r4/Observation?patient=Patient!123&category=vital-signs')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })
})
