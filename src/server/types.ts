import type { HttpBindings } from '@hono/node-server'

import type { Logger } from './utils/logger'

export type AppEnv = {
  Variables: {
    logger: Logger
  }
  Bindings: HttpBindings
}
