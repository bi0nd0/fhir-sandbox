import { Hono } from 'hono'

import { getPatientHandler } from '../handlers/patient-handler'
import type { AppEnv } from '../types'

export const patientRoutes = new Hono<AppEnv>()

patientRoutes.get('/:id', getPatientHandler)
