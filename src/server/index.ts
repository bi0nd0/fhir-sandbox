import 'dotenv/config'

import { serve } from '@hono/node-server'
import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response'
import { Hono } from 'hono'
import type { Context } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { performance } from 'node:perf_hooks'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type Provider from 'oidc-provider'
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
import { adminTokensRoute } from './routes/admin-tokens'

import { createOidcProvider } from './oauth/provider'
import { finalizeInteraction, getInteractionContext } from './oauth/interactions'
import type { AppEnv } from './types'
import { createChildLogger, logger } from './utils/logger'
import { mapErrorToOperationOutcome, NotFoundError } from './utils/errors'
import { parseBasicAuthHeader } from './utils/oauth'
import { createAuthService } from './services/auth-service'

const CLIENT_DIST_DIR = path.resolve(process.cwd(), 'dist/client')
const PUBLIC_DIR = path.resolve(process.cwd(), 'public')
const SPA_ENTRY_PATH = path.join(CLIENT_DIST_DIR, 'index.html')

let spaHtmlCache: string | null = null

const loadSpaHtml = (): string | null => {
  if (spaHtmlCache) {
    return spaHtmlCache
  }

  if (existsSync(SPA_ENTRY_PATH)) {
    spaHtmlCache = readFileSync(SPA_ENTRY_PATH, 'utf-8')
    return spaHtmlCache
  }

  return null
}

const serveSpa = (c: Context<AppEnv>) => {
  const html = loadSpaHtml()

  if (!html) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
    if (process.env.NODE_ENV !== 'production') {
      const devHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SMART Sandbox</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${devServerUrl}/src/client/main.ts"></script>
  </body>
</html>`
      return c.html(devHtml)
    }

    return c.text(
      'Client build not found. Run `npm run build:client` (production) or start the Vite dev server.',
      503,
    )
  }

  return c.html(html)
}


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

  app.use('/assets/*', serveStatic({ root: CLIENT_DIST_DIR }))

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

  app.get('/oauth2/session', serveSpa)
  app.get('/oauth2/interaction/:uid', async (c) => {
    const { uid } = c.req.param()
    const { incoming, outgoing } = c.env

    try {
      const { setCookies } = await getInteractionContext(provider, incoming, outgoing, uid)
      for (const cookie of setCookies) {
        c.header('Set-Cookie', cookie, { append: true })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Interaction lookup failed'
      return c.json({ error: 'interaction_not_found', message }, 404)
    }

    return serveSpa(c)
  })
  app.get('/admin/ui/*', serveSpa)

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
    const cookieName = (provider as unknown as { cookieName: (type: string) => string }).cookieName('session')
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

  app.get('/oauth2/api/interaction/:uid', async (c) => {
    const { uid } = c.req.param()
    try {
      const { incoming, outgoing } = c.env
      const { context, setCookies } = await getInteractionContext(provider, incoming, outgoing, uid)
      console.log('print something')
      for (const cookie of setCookies) {
        c.header('Set-Cookie', cookie, { append: true })
      }
      return c.json(context)
    } catch (error) {
      console.log(error)
      const message = error instanceof Error ? error.message : 'Unable to load interaction context'
      return c.json({ error: 'interaction_not_found', message }, 404)
    }
  })

  app.post('/oauth2/api/interaction/:uid/login', async (c) => {
    const { uid } = c.req.param()
    let payload: { username?: string; password?: string }

    try {
      payload = await c.req.json()
    } catch {
      return c.json({ error: 'invalid_request', message: 'Expected JSON body.' }, 400)
    }

    const username = (payload.username ?? '').trim()
    const password = payload.password ?? ''

    if (!username || !password) {
      return c.json({ error: 'invalid_credentials', message: 'Username and password are required.' }, 400)
    }

    const auth = c.get('authService')
    const requestLogger = c.get('logger')
    const user = auth.verifyCredentials(username, password)

    if (!user) {
      requestLogger.warn({ username }, 'Authentication failed during interaction login')
      return c.json({ error: 'invalid_credentials', message: 'Invalid username or password.' }, 401)
    }

    const { incoming, outgoing } = c.env

    try {
      const { redirectTo, setCookies } = await finalizeInteraction(
        provider,
        incoming,
        outgoing,
        uid,
        user.id,
      )
      requestLogger.info({ username, userId: user.id }, 'Authorization interaction authenticated')
      for (const cookie of setCookies) {
        c.header('Set-Cookie', cookie, { append: true })
      }
      return c.json({ status: 'ok', redirectTo })
    } catch (error) {
      requestLogger.error({ error, username }, 'Failed to finalize interaction')
      return c.json({ error: 'interaction_error', message: 'Unable to finalize interaction.' }, 500)
    }
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
  app.route('/admin/tokens', adminTokensRoute)
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
