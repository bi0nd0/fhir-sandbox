import { Hono } from 'hono'

import { searchPatientHandler } from '../handlers/patient-handler'
import type { AppEnv } from '../types'

export const patientRoutes = new Hono<AppEnv>()

patientRoutes.get('/', searchPatientHandler)
