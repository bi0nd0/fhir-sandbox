import { serve } from '@hono/node-server'
import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { allergyIntoleranceRoutes } from './routes/allergy-intolerance'
import { medicationRequestRoutes } from './routes/medication-request'
import { metadataRoute } from './routes/metadata'
import { observationRoutes } from './routes/observation'
import { patientRoutes } from './routes/patient'
import { conditionRoutes } from './routes/condition'
import { coverageRoutes } from './routes/coverage'
import { encounterRoutes } from './routes/encounter'
import { createOidcProvider } from './oauth/provider'
import { completeInteraction } from './oauth/interactions'
import type { AppEnv } from './types'
import { createChildLogger, logger } from './utils/logger'
import { mapErrorToOperationOutcome, NotFoundError } from './utils/errors'
import { parseBasicAuthHeader } from './utils/oauth'

export const createApp = () => {
  const { provider, registerOrUpdateClient } = createOidcProvider()
  const app = new Hono<AppEnv>()

  const corsEnv = process.env.CORS_ALLOW_ORIGINS ?? '*'
  const origins = corsEnv
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  app.use(
    '*',
    cors({
      origin: origins.includes('*') ? '*' : origins,
      credentials: false,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['Content-Type'],
      maxAge: 86400,
    }),
  )

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

  app.get('/__health', (c) => c.json({ status: 'ok' }))

  app.use('/oauth2/authorize', async (c, next) => {
    const url = new URL(c.req.url)
    const clientId = url.searchParams.get('client_id')
    const redirectUri = url.searchParams.get('redirect_uri') ?? undefined

    if (clientId) {
      await registerOrUpdateClient({ clientId, redirectUri })
    }

    await next()
  })

  app.use('/oauth2/token', async (c, next) => {
    const credentials = parseBasicAuthHeader(c.req.header('authorization'))

    if (credentials) {
      await registerOrUpdateClient({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
      })
    }

    await next()
  })

  app.all('/oauth2/interaction/:uid', async (c) => {
    const { incoming, outgoing } = c.env
    await completeInteraction(provider, incoming, outgoing)
    return RESPONSE_ALREADY_SENT
  })

  app.use('/oauth2/*', async (c) => {
    const { incoming, outgoing } = c.env
    const patchedIncoming = incoming as IncomingMessage & { originalUrl?: string }
    const originalUrl = incoming.url
    const originalOriginalUrl = patchedIncoming.originalUrl

    patchedIncoming.originalUrl = originalUrl
    incoming.url = originalUrl.replace(/^\/oauth2/, '') || '/'

    provider.callback()(incoming, outgoing)

    await new Promise<void>((resolve) => {
      if (outgoing.writableEnded) {
        resolve()
        return
      }
      outgoing.once('finish', resolve)
    })

    incoming.url = originalUrl

    if (originalOriginalUrl === undefined) {
      delete patchedIncoming.originalUrl
    } else {
      patchedIncoming.originalUrl = originalOriginalUrl
    }

    return RESPONSE_ALREADY_SENT
  })

  app.route('/r4/Patient', patientRoutes)
  app.route('/r4/Observation', observationRoutes)
  app.route('/r4/AllergyIntolerance', allergyIntoleranceRoutes)
  app.route('/r4/MedicationRequest', medicationRequestRoutes)
  app.route('/r4/Condition', conditionRoutes)
  app.route('/r4/Coverage', coverageRoutes)
  app.route('/r4/Encounter', encounterRoutes)
  app.route('/:version/metadata', metadataRoute)

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
