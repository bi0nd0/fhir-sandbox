import type { Context } from 'hono'

import { getMedicationRequests } from '../services/fhir-repository'
import { patientQuerySchema } from '../schemas/common'
import { BadRequestError } from '../utils/errors'
import { normalizePatientReference } from '../utils/fhir'
import type { AppEnv } from '../types'

export const listMedicationRequestsHandler = async (c: Context<AppEnv>) => {
  const parseResult = patientQuerySchema.safeParse(c.req.query())

  if (!parseResult.success) {
    throw new BadRequestError(parseResult.error.issues.map((issue) => issue.message).join(', '))
  }

  const patientId = normalizePatientReference(parseResult.data.patient)
  const payload = await getMedicationRequests(patientId)

  return c.json(payload, 200, { 'content-type': 'application/fhir+json' })
}
