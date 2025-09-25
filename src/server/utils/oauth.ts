import { Buffer } from 'node:buffer'

import { BadRequestError } from './errors'

type ClientCredentials = {
  clientId: string
  clientSecret?: string
}

export const parseBasicAuthHeader = (header?: string | null): ClientCredentials | undefined => {
  if (!header) {
    return undefined
  }

  if (!header.startsWith('Basic ')) {
    throw new BadRequestError('Unsupported Authorization header format')
  }

  const encoded = header.slice(6).trim()
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
  const separatorIndex = decoded.indexOf(':')

  if (separatorIndex === -1) {
    throw new BadRequestError('Invalid basic authorization header format')
  }

  const clientId = decoded.slice(0, separatorIndex)
  const clientSecret = decoded.slice(separatorIndex + 1)

  if (!clientId) {
    throw new BadRequestError('Client identifier missing in Authorization header')
  }

  return { clientId, clientSecret }
}
