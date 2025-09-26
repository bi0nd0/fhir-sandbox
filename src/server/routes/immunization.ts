import { Hono } from 'hono'

import { listImmunizationsHandler } from '../handlers/immunization-handler'
import type { AppEnv } from '../types'

export const immunizationRoutes = new Hono<AppEnv>()

immunizationRoutes.get('/', listImmunizationsHandler)
