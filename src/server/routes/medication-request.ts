import { Hono } from 'hono'

import { listMedicationRequestsHandler } from '../handlers/medication-request-handler'
import type { AppEnv } from '../types'

export const medicationRequestRoutes = new Hono<AppEnv>()

medicationRequestRoutes.get('/', listMedicationRequestsHandler)
