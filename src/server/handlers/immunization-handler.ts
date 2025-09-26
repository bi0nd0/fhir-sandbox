import type { Context } from 'hono'

import { getImmunizations } from '../services/fhir-repository'
import { patientQuerySchema } from '../schemas/common'
import { BadRequestError } from '../utils/errors'
import { normalizePatientReference } from '../utils/fhir'
import type { AppEnv } from '../types'

export const listImmunizationsHandler = async (c: Context<AppEnv>) => {
  const parseResult = patientQuerySchema.safeParse(c.req.query())

  if (!parseResult.success) {
    throw new BadRequestError(parseResult.error.issues.map((issue) => issue.message).join(', '))
  }

  const { patient } = parseResult.data
  const patientId = normalizePatientReference(patient)
  const payload = await getImmunizations(patientId)

  return c.json(payload, 200, { 'content-type': 'application/fhir+json' })
}
