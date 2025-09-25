import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/MedicationRequest', () => {
  it('returns medication requests for a patient', async () => {
    const response = await app.request('/r4/MedicationRequest?patient=123456')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(1)
  })

  it('accepts a Patient/<id> reference', async () => {
    const response = await app.request('/r4/MedicationRequest?patient=Patient/123456')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(1)
  })

  it('returns 404 when the payload is missing', async () => {
    const response = await app.request('/r4/MedicationRequest?patient=999999')

    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('not-found')
  })

  it('rejects invalid patient references', async () => {
    const response = await app.request('/r4/MedicationRequest?patient=Patient!123')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })
})
