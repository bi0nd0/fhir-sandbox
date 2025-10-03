import { serve } from '@hono/node-server'
import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response'
import { Hono } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import instance from 'oidc-provider/lib/helpers/weak_cache.js'

import { allergyIntoleranceRoutes } from './routes/allergy-intolerance'
import { medicationRequestRoutes } from './routes/medication-request'
import { metadataRoute } from './routes/metadata'
import { observationRoutes } from './routes/observation'
import { patientRoutes } from './routes/patient'
import { conditionRoutes } from './routes/condition'
import { coverageRoutes } from './routes/coverage'
import { encounterRoutes } from './routes/encounter'
import { appointmentRoutes } from './routes/appointment'
import { deviceRoutes } from './routes/device'
import { procedureRoutes } from './routes/procedure'
import { immunizationRoutes } from './routes/immunization'

import { createOidcProvider } from './oauth/provider'
import {
  finalizeInteraction,
  getInteractionContext,
  renderInteractionPage,
  renderSessionPage,
} from './oauth/interactions'
import type { AppEnv } from './types'
import { createChildLogger, logger } from './utils/logger'
import { mapErrorToOperationOutcome, NotFoundError } from './utils/errors'
import { parseBasicAuthHeader } from './utils/oauth'
import { createAuthService } from './services/auth-service'

export const createApp = () => {
  const { provider, registerOrUpdateClient } = createOidcProvider()
  const authService = createAuthService()
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

  app.use('/assets/*', serveStatic({ root: './public' }))

  app.use('*', async (c, next) => {
    const requestId = randomUUID()
    const requestLogger = createChildLogger({
      requestId,
      method: c.req.method,
      path: c.req.path,
    })

    const start = performance.now()
    c.set('logger', requestLogger)
    c.set('authService', authService)

    try {
      await next()
    } finally {
      const durationMs = Number((performance.now() - start).toFixed(2))
      requestLogger.info({ status: c.res.status, durationMs }, 'Request completed')
    }
  })

  app.get('/__health', (c) => c.json({ status: 'ok' }))

  app.get('/oauth2/session', (c) => c.html(renderSessionPage()))

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

  app.post('/oauth2/logout', async (c) => {
    const { incoming, outgoing } = c.env
    const providerContext = provider.createContext(incoming, outgoing)
    const session = await provider.Session.get(providerContext)
    const cookieName = provider.cookieName('session')
    const cookieOptions = instance(provider).configuration.cookies.long

    if (!session.accountId) {
      providerContext.cookies.set(cookieName, null, cookieOptions)
      return c.json({ status: 'no-active-session' })
    }

    const accountId = session.accountId
    await session.destroy()
    providerContext.cookies.set(cookieName, null, cookieOptions)
    const log = c.get('logger')
    log.info({ accountId }, 'Session terminated via logout endpoint')

    return c.json({ status: 'logged-out' })
  })

  app.get('/oauth2/interaction/:uid', async (c) => {
    const { incoming, outgoing } = c.env
    const context = await getInteractionContext(provider, incoming, outgoing)
    const errorCode = c.req.query('error') ?? undefined
    const lastUsername = c.req.query('username') ?? undefined

    const errorMessage = errorCode === 'invalid_credentials' ? 'Invalid username or password.' : undefined

    const html = renderInteractionPage({
      ...context,
      errorMessage,
      lastUsername,
    })

    return c.html(html)
  })

  app.post('/oauth2/interaction/:uid/login', async (c) => {
    const { uid } = c.req.param()
    const body = await c.req.parseBody()
    const usernameRaw = body['username']
    const passwordRaw = body['password']
    const username = typeof usernameRaw === 'string' ? usernameRaw.trim() : ''
    const password = typeof passwordRaw === 'string' ? passwordRaw : ''

    if (!username || !password) {
      const query = new URLSearchParams({ error: 'invalid_credentials' })
      if (username) {
        query.set('username', username)
      }
      return c.redirect(`/oauth2/interaction/${encodeURIComponent(uid)}?${query.toString()}`, 303)
    }

    const auth = c.get('authService')
    const requestLogger = c.get('logger')
    const user = auth.verifyCredentials(username, password)

    if (!user) {
      const query = new URLSearchParams({ error: 'invalid_credentials', username })
      return c.redirect(`/oauth2/interaction/${encodeURIComponent(uid)}?${query.toString()}`, 303)
    }

    const { incoming, outgoing } = c.env
    requestLogger.info({ username, userId: user.id }, 'Authorization interaction authenticated')
    await finalizeInteraction(provider, incoming, outgoing, user.id)
    return RESPONSE_ALREADY_SENT
  })

  app.use('/oauth2/*', async (c) => {
    const { incoming, outgoing } = c.env
    const patchedIncoming = incoming as IncomingMessage & { originalUrl?: string }
    const originalUrl = incoming.url ?? '/'
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
  app.route('/r4/Appointment', appointmentRoutes)
  app.route('/r4/Device', deviceRoutes)
  app.route('/r4/Procedure', procedureRoutes)
  app.route('/r4/Immunization', immunizationRoutes)
  app.route('/:version/metadata', metadataRoute)

  app.notFound((c) => {
    const outcome = mapErrorToOperationOutcome(new NotFoundError(`Route not found: ${c.req.path}`))
    c.status(outcome.status as StatusCode)
    return c.json(outcome.body, undefined, { 'content-type': 'application/fhir+json' })
  })

  app.onError((error, c) => {
    const outcome = mapErrorToOperationOutcome(error)
    const requestLogger = c.get('logger')
    requestLogger.error({ error }, 'Request failed')
    c.status(outcome.status as StatusCode)
    return c.json(outcome.body, undefined, { 'content-type': 'application/fhir+json' })
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
