import { Hono } from 'hono'

import { listProceduresHandler } from '../handlers/procedure-handler'
import type { AppEnv } from '../types'

export const procedureRoutes = new Hono<AppEnv>()

procedureRoutes.get('/', listProceduresHandler)
