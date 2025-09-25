import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/Patient?_id={id}', () => {
  it('returns a bundle wrapping the requested patient', async () => {
    const response = await app.request('/r4/Patient?_id=123456')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(1)
    const entry = body.entry?.[0]
    expect(entry?.fullUrl).toBe('Patient/123456')
    expect(entry?.resource?.resourceType).toBe('Patient')
    expect(entry?.resource?.id).toBe('123456')
    expect(entry?.search?.mode).toBe('match')
  })

  it('returns an empty bundle when no patient matches', async () => {
    const response = await app.request('/r4/Patient?_id=999999')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(0)
    expect(body.entry).toEqual([])
  })

  it('rejects missing id query parameter', async () => {
    const response = await app.request('/r4/Patient')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
    expect(body.issue?.[0]?.diagnostics).toContain('_id')
  })
})
