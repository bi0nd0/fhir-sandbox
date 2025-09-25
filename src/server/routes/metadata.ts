import { Hono } from 'hono'

import { capabilityStatementHandler } from '../handlers/metadata-handler'
import type { AppEnv } from '../types'

export const metadataRoute = new Hono<AppEnv>()

metadataRoute.get('/', capabilityStatementHandler)
