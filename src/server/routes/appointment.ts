import { Hono } from 'hono'

import { listAppointmentsHandler } from '../handlers/appointment-handler'
import type { AppEnv } from '../types'

export const appointmentRoutes = new Hono<AppEnv>()

appointmentRoutes.get('/', listAppointmentsHandler)
