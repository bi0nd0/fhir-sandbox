import pino, { type Bindings, type Logger as PinoLogger } from 'pino'

const isDevelopment = process.env.NODE_ENV !== 'production'

const transport = isDevelopment
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    }
  : undefined

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport,
})

export type Logger = PinoLogger

export const createChildLogger = (bindings: Bindings): Logger => logger.child(bindings)
