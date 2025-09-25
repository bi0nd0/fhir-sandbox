import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/metadata', () => {
  it('returns a minimal capability statement', async () => {
    const response = await app.request('/r4/metadata')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/fhir+json')
    expect(response.headers.get('access-control-allow-origin')).toBe('*')

    const body = await response.json()
    expect(body.resourceType).toBe('CapabilityStatement')
    expect(body.status).toBe('active')
    expect(body.experimental).toBe(false)
    expect(body.kind).toBe('capability')
    expect(body.fhirVersion).toBe('4.0.1')
    expect(body.instantiates).toContain(
      'http://hl7.org/fhir/smart-app-launch/CapabilityStatement/smart-app-launch',
    )

    const rest = body.rest?.[0]
    expect(rest.mode).toBe('server')
    const resourceSummary = rest?.resource?.map((r: any) => r.type)
    expect(resourceSummary).toEqual(
      expect.arrayContaining(['Patient', 'Observation', 'AllergyIntolerance', 'MedicationRequest']),
    )

    const oauthExtension = rest?.security?.extension?.[0]
    expect(oauthExtension?.extension).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'authorize',
          valueUri: expect.stringContaining('/oauth2/authorize'),
        }),
        expect.objectContaining({
          url: 'token',
          valueUri: expect.stringContaining('/oauth2/token'),
        }),
      ]),
    )
    expect(Array.isArray(oauthExtension?.extension)).toBe(true)
  })

  it('returns 404 for unsupported FHIR versions', async () => {
    const response = await app.request('/stu3/metadata')

    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('not-found')
  })

  it('reflects forwarded protocol and host in SMART endpoints', async () => {
    const response = await app.request('/r4/metadata', {
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'fhir-server.test',
      },
    })

    expect(response.status).toBe(200)

    const body = await response.json()
    const smartUris = body?.rest?.[0]?.security?.extension?.[0]?.extension ?? []
    const authorize = smartUris.find((item: any) => item.url === 'authorize')
    const token = smartUris.find((item: any) => item.url === 'token')

    expect(authorize?.valueUri).toBe('https://fhir-server.test/oauth2/authorize')
    expect(token?.valueUri).toBe('https://fhir-server.test/oauth2/token')
  })
})
