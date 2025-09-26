import { Hono } from 'hono'

import { listDevicesHandler } from '../handlers/device-handler'
import type { AppEnv } from '../types'

export const deviceRoutes = new Hono<AppEnv>()

deviceRoutes.get('/', listDevicesHandler)
