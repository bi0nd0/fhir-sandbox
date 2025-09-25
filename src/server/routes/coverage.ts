import { Hono } from 'hono'

import { listCoverageHandler } from '../handlers/coverage-handler'
import type { AppEnv } from '../types'

export const coverageRoutes = new Hono<AppEnv>()

coverageRoutes.get('/', listCoverageHandler)
