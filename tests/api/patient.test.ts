import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/Patient/:id', () => {
  it('returns the requested patient resource', async () => {
    const response = await app.request('/r4/Patient/123456')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/fhir+json')

    const body = await response.json()
    expect(body.resourceType).toBe('Patient')
    expect(body.id).toBe('123456')
  })

  it('returns 404 when the patient payload is missing', async () => {
    const response = await app.request('/r4/Patient/999999')

    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('not-found')
  })
})
