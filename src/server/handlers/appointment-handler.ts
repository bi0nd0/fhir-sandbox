import type { Context } from 'hono'

import { getAppointments } from '../services/fhir-repository'
import { appointmentQuerySchema } from '../schemas/appointment-query'
import { BadRequestError } from '../utils/errors'
import { normalizePatientReference } from '../utils/fhir'
import type { AppEnv } from '../types'

export const listAppointmentsHandler = async (c: Context<AppEnv>) => {
  const parseResult = appointmentQuerySchema.safeParse(c.req.query())

  if (!parseResult.success) {
    throw new BadRequestError(parseResult.error.issues.map((issue) => issue.message).join(', '))
  }

  const { patient, 'service-category': serviceCategory } = parseResult.data
  const patientId = normalizePatientReference(patient)
  const payload = await getAppointments(patientId, serviceCategory)

  return c.json(payload, 200, { 'content-type': 'application/fhir+json' })
}
