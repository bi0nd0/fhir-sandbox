import type { Context } from 'hono'

import type { AppEnv } from '../types'
import { NotFoundError } from '../utils/errors'

const SMART_SECURITY_EXTENSION_URL =
  'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'

const FHIR_VERSION_MAP: Record<string, { fhirVersion: string }> = {
  r4: { fhirVersion: '4.0.1' },
}

const SMART_INSTANTIATES_URL =
  'http://hl7.org/fhir/smart-app-launch/CapabilityStatement/smart-app-launch'

const resolveOrigin = (c: Context<AppEnv>): string => {
  const explicit = process.env.EXTERNAL_BASE_URL?.trim()
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }

  const forwardedProto = c.req.header('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost =
    c.req.header('x-forwarded-host')?.split(',')[0]?.trim() ?? c.req.header('host')

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return new URL(c.req.url).origin
}

export const capabilityStatementHandler = (c: Context<AppEnv>) => {
  const origin = resolveOrigin(c)
  const version = c.req.param('version')?.toLowerCase()
  const metadata = version ? FHIR_VERSION_MAP[version] : undefined

  if (!metadata) {
    throw new NotFoundError(`Unsupported FHIR release '${version ?? 'unknown'}'`)
  }

  const capabilityStatement = {
    resourceType: 'CapabilityStatement',
    status: 'active',
    experimental: false,
    date: new Date().toISOString(),
    kind: 'capability' as const,
    copyright: 'SMART on FHIR Sandbox © 2024',
    instantiates: [SMART_INSTANTIATES_URL],
    fhirVersion: metadata.fhirVersion,
    format: ['json', 'application/fhir+json'],
    rest: [
      {
        mode: 'server' as const,
        security: {
          service: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
                  code: 'SMART-on-FHIR',
                  display: 'SMART on FHIR',
                },
              ],
              text: 'OAuth2 using SMART on FHIR',
            },
          ],
          extension: [
            {
              url: SMART_SECURITY_EXTENSION_URL,
              extension: [
                { url: 'authorize', valueUri: `${origin}/oauth2/authorize` },
                { url: 'token', valueUri: `${origin}/oauth2/token` },
              ],
            },
          ],
        },
        resource: [
          {
            type: 'Patient',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [
              {
                name: '_id',
                type: 'token',
                documentation: 'Search patient records by logical id',
              },
            ],
          },
          {
            type: 'Condition',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              {
                name: 'patient',
                type: 'reference',
                documentation: 'Filter conditions by patient reference',
              },
              {
                name: 'category',
                type: 'token',
                documentation:
                  'Filter conditions by category (problem-list-item, reason-for-visit, medical-history, dental-finding, infection, encounter-diagnosis, genomics)',
              },
            ],
          },
          {
            type: 'Observation',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              {
                name: 'patient',
                type: 'reference',
                documentation: 'Filter observations by patient reference',
              },
              {
                name: 'category',
                type: 'token',
                documentation:
                  'Filter observations by category (vital-signs, laboratory, social-history, core-characteristics)',
              },
            ],
          },
          {
            type: 'AllergyIntolerance',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              {
                name: 'patient',
                type: 'reference',
                documentation: 'Filter allergy intolerances by patient reference',
              },
            ],
          },
          {
            type: 'MedicationRequest',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              {
                name: 'patient',
                type: 'reference',
                documentation: 'Filter medication requests by patient reference',
              },
            ],
          },
          {
            type: 'Device',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              {
                name: 'patient',
                type: 'reference',
                documentation: 'Filter devices by patient reference',
              },
            ],
          },
          {
            type: 'Procedure',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              {
                name: 'patient',
                type: 'reference',
                documentation: 'Filter procedures by patient reference',
              },
            ],
          },
          {
            type: 'Immunization',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              {
                name: 'patient',
                type: 'reference',
                documentation: 'Filter immunizations by patient reference',
              },
            ],
          },
          {
            type: 'Appointment',
            interaction: [{ code: 'search-type' }],
            searchParam: [
              {
                name: 'patient',
                type: 'reference',
                documentation: 'Filter appointments by patient reference',
              },
              {
                name: 'service-category',
                type: 'token',
                documentation: 'Filter appointments by service category code',
              },
            ],
          },
        ],
      },
    ],
  }

  return c.json(capabilityStatement, 200, { 'content-type': 'application/fhir+json' })
}
