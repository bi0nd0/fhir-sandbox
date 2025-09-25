import { Hono } from 'hono'

import { listEncountersHandler } from '../handlers/encounter-handler'
import type { AppEnv } from '../types'

export const encounterRoutes = new Hono<AppEnv>()

encounterRoutes.get('/', listEncountersHandler)
