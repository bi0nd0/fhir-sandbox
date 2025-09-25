import { Hono } from 'hono'

import { listObservationsHandler } from '../handlers/observation-handler'
import type { AppEnv } from '../types'

export const observationRoutes = new Hono<AppEnv>()

observationRoutes.get('/', listObservationsHandler)
