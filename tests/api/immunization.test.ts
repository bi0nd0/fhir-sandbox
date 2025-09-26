import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/Immunization', () => {
  it('returns immunizations for a patient reference', async () => {
    const response = await app.request('/r4/Immunization?patient=123456')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(4)
    const patients = (body.entry ?? []).map((entry: any) => entry.resource?.patient?.reference)
    expect(patients).toContain('Patient/123456')
  })

  it('accepts patient references with resource prefix', async () => {
    const response = await app.request('/r4/Immunization?patient=Patient/123456')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(4)
  })

  it('rejects missing patient query', async () => {
    const response = await app.request('/r4/Immunization')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })

  it('rejects invalid patient references', async () => {
    const response = await app.request('/r4/Immunization?patient=Patient!123')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })
})
