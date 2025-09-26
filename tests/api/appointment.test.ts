import { describe, expect, it } from 'vitest'

import { createApp } from '../../src/server/index'

const app = createApp()

describe('GET /r4/Appointment', () => {
  it('returns appointments for the general appointment service category', async () => {
    const response = await app.request(
      '/r4/Appointment?patient=123456&service-category=appointment',
    )

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBeGreaterThan(0)
    const codes = (body.entry ?? []).flatMap((entry: any) =>
      (entry.resource?.serviceCategory ?? []).flatMap((category: any) =>
        (category.coding ?? []).map((coding: any) => coding.code ?? ''),
      ),
    )
    expect(codes).toContain('appointment')
  })

  it('returns appointments for the surgery service category', async () => {
    const response = await app.request('/r4/Appointment?patient=123456&service-category=surgery')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBeGreaterThan(0)
    const codes = (body.entry ?? []).flatMap((entry: any) =>
      (entry.resource?.serviceCategory ?? []).flatMap((category: any) =>
        (category.coding ?? []).map((coding: any) => coding.code ?? ''),
      ),
    )
    expect(codes).toContain('surgery')
  })

  it('rejects missing service category queries', async () => {
    const response = await app.request('/r4/Appointment?patient=123456')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })

  it('rejects unsupported service categories', async () => {
    const response = await app.request(
      '/r4/Appointment?patient=123456&service-category=follow-up',
    )

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })
})
