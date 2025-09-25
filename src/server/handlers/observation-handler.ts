import type { Context } from 'hono'

import { getObservations } from '../services/fhir-repository'
import { observationQuerySchema } from '../schemas/observation-query'
import { BadRequestError } from '../utils/errors'
import { normalizePatientReference } from '../utils/fhir'
import type { AppEnv } from '../types'

export const listObservationsHandler = async (c: Context<AppEnv>) => {
  const parseResult = observationQuerySchema.safeParse(c.req.query())

  if (!parseResult.success) {
    throw new BadRequestError(parseResult.error.issues.map((issue) => issue.message).join(', '))
  }

  const { patient, category } = parseResult.data
  const patientId = normalizePatientReference(patient)
  const payload = await getObservations(patientId, category)

  return c.json(payload, 200, { 'content-type': 'application/fhir+json' })
}
