import { Hono } from 'hono'

import { listAllergyIntolerancesHandler } from '../handlers/allergy-intolerance-handler'
import type { AppEnv } from '../types'

export const allergyIntoleranceRoutes = new Hono<AppEnv>()

allergyIntoleranceRoutes.get('/', listAllergyIntolerancesHandler)
