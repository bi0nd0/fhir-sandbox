import type { IncomingMessage, ServerResponse } from 'node:http'

import type Provider from 'oidc-provider'
import instance from 'oidc-provider/lib/helpers/weak_cache.js'

export type InteractionContext = {
  uid: string
  clientId?: string
  clientName?: string
  redirectUri?: string
  scopes: string[]
}


const toScopeList = (scopeParam: unknown): string[] => {
  if (typeof scopeParam !== 'string') {
    return []
  }

  return scopeParam
    .split(' ')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

type WithInteractionResult<T> = {
  result: T
  setCookies: string[]
}

const withPatchedInteraction = async <T>(
  provider: Provider,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  uid: string,
  handler: () => Promise<T>,
): Promise<WithInteractionResult<T>> => {
  const patchedIncoming = incoming as IncomingMessage & { originalUrl?: string }
  const originalUrl = incoming.url ?? '/'
  const originalOriginalUrl = patchedIncoming.originalUrl

  patchedIncoming.originalUrl = originalUrl
  incoming.url = `/oauth2/interaction/${uid}`

  const cookieName = (provider as unknown as { cookieName: (type: string) => string }).cookieName(
    'interaction',
  )
  const sigName = `${cookieName}.sig`

  if (!incoming.headers['cookie']?.includes(`${cookieName}=`)) {
    const existingHeader = incoming.headers['cookie'] ?? ''
    const entries = existingHeader
      .split(';')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .filter((value) => !value.startsWith(`${cookieName}=`) && !value.startsWith(`${sigName}=`))

    const shortOptions = instance(provider).configuration.cookies.short
    const { cookies } = provider.createContext(incoming, outgoing)
    cookies.set(cookieName, uid, shortOptions)

    const header = outgoing.getHeader('set-cookie')
    const setCookies = header
      ? Array.isArray(header)
        ? header.map((value) => String(value))
        : [String(header)]
      : []

    outgoing.removeHeader('set-cookie')

    const interactionCookie = setCookies.find((value) => value.startsWith(`${cookieName}=`))
    const signatureCookie = setCookies.find((value) => value.startsWith(`${sigName}=`))

    if (!interactionCookie || !signatureCookie) {
      throw new Error('OIDC interaction cookie could not be established')
    }

    const interactionValue = interactionCookie.split(';')[0]
    const sigValue = signatureCookie.split(';')[0]

    entries.push(interactionValue)
    entries.push(sigValue)

    incoming.headers['cookie'] = entries.join('; ')
  }

  try {
    const result = await handler()
    const header = outgoing.getHeader('set-cookie')
    const setCookies = header
      ? Array.isArray(header)
        ? header.map((value) => String(value))
        : [String(header)]
      : []
    outgoing.removeHeader('set-cookie')
    return { result, setCookies }
  } finally {
    incoming.url = originalUrl
    if (originalOriginalUrl === undefined) {
      delete patchedIncoming.originalUrl
    } else {
      patchedIncoming.originalUrl = originalOriginalUrl
    }
  }
}

export const getInteractionContext = async (
  provider: Provider,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  uid: string,
): Promise<{ context: InteractionContext; setCookies: string[] }> => {
  const { result: details, setCookies } = await withPatchedInteraction(
    provider,
    incoming,
    outgoing,
    uid,
    () => provider.interactionDetails(incoming, outgoing),
  )

  const { params } = details

  const clientId = typeof params.client_id === 'string' ? params.client_id : undefined
  const client = clientId ? await provider.Client.find(clientId) : undefined
  const metadata = (client?.metadata?.() ?? {}) as Record<string, unknown>

  return {
    context: {
      uid: details.uid,
      clientId,
      clientName: typeof metadata.client_name === 'string' ? (metadata.client_name as string) : undefined,
      redirectUri: typeof params.redirect_uri === 'string' ? params.redirect_uri : undefined,
      scopes: toScopeList(params.scope),
    },
    setCookies,
  }
}

export const finalizeInteraction = async (
  provider: Provider,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  uid: string,
  accountId: string,
): Promise<{ redirectTo: string; setCookies: string[] }> => {
  const { result: redirectTo, setCookies } = await withPatchedInteraction(
    provider,
    incoming,
    outgoing,
    uid,
    async () => {
      const details = await provider.interactionDetails(incoming, outgoing)
      const { params } = details

      let grant = details.grantId ? await provider.Grant.find(details.grantId) : undefined

      if (!grant) {
        grant = new provider.Grant({
          accountId,
          clientId: params.client_id as string,
        })
      }

      if (params.scope && typeof params.scope === 'string') {
        grant.addOIDCScope(params.scope)
      }

      const grantId = await grant.save()

      return provider.interactionResult(
        incoming,
        outgoing,
        {
          login: {
            accountId,
            acr: 'urn:mace:incommon:iap:silver',
          },
          consent: {
            grantId,
          },
        },
        { mergeWithLastSubmission: false },
      )
    },
  )

  return { redirectTo, setCookies }
}
