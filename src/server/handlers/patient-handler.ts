import type { Context } from 'hono'

import { getPatient } from '../services/fhir-repository'
import type { AppEnv } from '../types'

export const getPatientHandler = async (c: Context<AppEnv>) => {
  const id = c.req.param('id')
  const resource = await getPatient(id)

  return c.json(resource, 200, { 'content-type': 'application/fhir+json' })
}
