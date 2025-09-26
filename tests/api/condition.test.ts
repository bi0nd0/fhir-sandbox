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

  it('returns dental findings when requested', async () => {
    const response = await app.request('/r4/Condition?patient=123456&category=dental-finding')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(3)
    const categories = (body.entry ?? []).flatMap((entry: any) =>
      (entry.resource?.category ?? []).flatMap((category: any) =>
        (category.coding ?? []).map((coding: any) => coding.code ?? ''),
      ),
    )
    expect(categories).toContain('dental-finding')
  })

  it('returns infections when requested', async () => {
    const response = await app.request('/r4/Condition?patient=123456&category=infection')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(3)
    const categories = (body.entry ?? []).flatMap((entry: any) =>
      (entry.resource?.category ?? []).flatMap((category: any) =>
        (category.coding ?? []).map((coding: any) => coding.code ?? ''),
      ),
    )
    expect(categories).toContain('infection')
  })

  it('returns medical history when requested', async () => {
    const response = await app.request('/r4/Condition?patient=123456&category=medical-history')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(3)
    const categories = (body.entry ?? []).flatMap((entry: any) =>
      (entry.resource?.category ?? []).flatMap((category: any) =>
        (category.coding ?? []).map((coding: any) => coding.code ?? ''),
      ),
    )
    expect(categories).toContain('medical-history')
  })

  it('returns encounter diagnoses when requested', async () => {
    const response = await app.request('/r4/Condition?patient=123456&category=encounter-diagnosis')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(3)
    const categories = (body.entry ?? []).flatMap((entry: any) =>
      (entry.resource?.category ?? []).flatMap((category: any) =>
        (category.coding ?? []).map((coding: any) => coding.code ?? ''),
      ),
    )
    expect(categories).toContain('encounter-diagnosis')
  })

  it('returns genomic findings when requested', async () => {
    const response = await app.request('/r4/Condition?patient=123456&category=genomics')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.resourceType).toBe('Bundle')
    expect(body.total).toBe(3)
    const categories = (body.entry ?? []).flatMap((entry: any) =>
      (entry.resource?.category ?? []).flatMap((category: any) =>
        (category.coding ?? []).map((coding: any) => coding.code ?? ''),
      ),
    )
    expect(categories).toContain('genomics')
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
    const response = await app.request('/r4/Condition?patient=123456&category=unsupported')

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })

  it('rejects invalid patient references', async () => {
    const response = await app.request(
      '/r4/Condition?patient=Patient!123&category=problem-list-item',
    )

    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.resourceType).toBe('OperationOutcome')
    expect(body.issue?.[0]?.code).toBe('invalid')
  })
})
