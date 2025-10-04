import type { IncomingMessage, ServerResponse } from 'node:http'

import type Provider from 'oidc-provider'

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

export const getInteractionContext = async (
  provider: Provider,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): Promise<InteractionContext> => {
  const details = await provider.interactionDetails(incoming, outgoing)
  const { params } = details

  const clientId = typeof params.client_id === 'string' ? params.client_id : undefined
  const client = clientId ? await provider.Client.find(clientId) : undefined
  const metadata = client?.metadata?.() ?? {}

  return {
    uid: details.uid,
    clientId,
    clientName: typeof metadata.client_name === 'string' ? metadata.client_name : undefined,
    redirectUri: typeof params.redirect_uri === 'string' ? params.redirect_uri : undefined,
    scopes: toScopeList(params.scope),
  }
}

export const finalizeInteraction = async (
  provider: Provider,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  accountId: string,
): Promise<string> => {
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

  const returnTo = await provider.interactionResult(
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

  return returnTo
}
