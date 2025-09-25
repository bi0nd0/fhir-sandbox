import type { Context } from 'hono'

import { getConditions } from '../services/fhir-repository'
import { conditionQuerySchema } from '../schemas/condition-query'
import { BadRequestError } from '../utils/errors'
import { normalizePatientReference } from '../utils/fhir'
import type { AppEnv } from '../types'

export const listConditionsHandler = async (c: Context<AppEnv>) => {
  const parseResult = conditionQuerySchema.safeParse(c.req.query())

  if (!parseResult.success) {
    throw new BadRequestError(parseResult.error.issues.map((issue) => issue.message).join(', '))
  }

  const { patient, category } = parseResult.data
  const patientId = normalizePatientReference(patient)
  const payload = await getConditions(patientId, category)

  return c.json(payload, 200, { 'content-type': 'application/fhir+json' })
}
