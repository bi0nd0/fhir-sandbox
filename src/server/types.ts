import type { HttpBindings } from '@hono/node-server'

import type { AuthService } from './services/auth-service'
import type { Logger } from './utils/logger'

export type AppEnv = {
  Variables: {
    logger: Logger
    authService: AuthService
  }
  Bindings: HttpBindings
}
