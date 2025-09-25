import { Hono } from 'hono'

import { listConditionsHandler } from '../handlers/condition-handler'
import type { AppEnv } from '../types'

export const conditionRoutes = new Hono<AppEnv>()

conditionRoutes.get('/', listConditionsHandler)
