import type { Context } from 'hono'

import { getPatient } from '../services/fhir-repository'
import { BadRequestError, NotFoundError } from '../utils/errors'
import type { AppEnv } from '../types'

export const searchPatientHandler = async (c: Context<AppEnv>) => {
  const id = c.req.query('_id')

  if (!id) {
    throw new BadRequestError('Query parameter "_id" is required')
  }

  try {
    const resource = await getPatient(id)
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [
        {
          fullUrl: `Patient/${resource?.id ?? id}`,
          resource,
          search: { mode: 'match' as const },
        },
      ],
    }

    return c.json(bundle, 200, { 'content-type': 'application/fhir+json' })
  } catch (error) {
    if (error instanceof NotFoundError) {
      const bundle = {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: [] as Array<never>,
      }

      return c.json(bundle, 200, { 'content-type': 'application/fhir+json' })
    }

    throw error
  }
}
