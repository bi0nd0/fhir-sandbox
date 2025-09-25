import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { allergyIntoleranceRoutes } from './routes/allergy-intolerance'
import { medicationRequestRoutes } from './routes/medication-request'
import { observationRoutes } from './routes/observation'
import { patientRoutes } from './routes/patient'
import type { AppEnv } from './types'
import { createChildLogger, logger } from './utils/logger'
import { mapErrorToOperationOutcome, NotFoundError } from './utils/errors'

export const createApp = () => {
  const app = new Hono<AppEnv>()

  app.use('*', async (c, next) => {
    const requestId = randomUUID()
    const requestLogger = createChildLogger({
      requestId,
      method: c.req.method,
      path: c.req.path,
    })

    const start = performance.now()
    c.set('logger', requestLogger)

    try {
      await next()
    } finally {
      const durationMs = Number((performance.now() - start).toFixed(2))
      requestLogger.info({ status: c.res.status, durationMs }, 'Request completed')
    }
  })

  app.route('/r4/Patient', patientRoutes)
  app.route('/r4/Observation', observationRoutes)
  app.route('/r4/AllergyIntolerance', allergyIntoleranceRoutes)
  app.route('/r4/MedicationRequest', medicationRequestRoutes)

  app.notFound((c) => {
    const outcome = mapErrorToOperationOutcome(new NotFoundError(`Route not found: ${c.req.path}`))
    return c.json(outcome.body, outcome.status, { 'content-type': 'application/fhir+json' })
  })

  app.onError((error, c) => {
    const outcome = mapErrorToOperationOutcome(error)
    const requestLogger = c.get('logger')
    requestLogger.error({ error }, 'Request failed')
    return c.json(outcome.body, outcome.status, { 'content-type': 'application/fhir+json' })
  })

  return app
}

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10)
const isMainEntry = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href,
)

if (isMainEntry) {
  const app = createApp()
  serve({ fetch: app.fetch, port: PORT })
  logger.info(`SMART on FHIR sandbox listening on http://localhost:${PORT}`)
}
