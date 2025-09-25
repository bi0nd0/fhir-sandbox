import type { IncomingMessage, ServerResponse } from 'node:http'

import type Provider from 'oidc-provider'

const DEFAULT_ACCOUNT_ID = 'sandbox-user'

export const completeInteraction = async (
  provider: Provider,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): Promise<void> => {
  const details = await provider.interactionDetails(incoming, outgoing)
  const { params } = details

  const accountId = DEFAULT_ACCOUNT_ID

  const grant = details.grantId
    ? await provider.Grant.find(details.grantId)
    : new provider.Grant({
        accountId,
        clientId: params.client_id as string,
      })

  if (params.scope && typeof params.scope === 'string') {
    grant.addOIDCScope(params.scope)
  }

  const grantId = await grant.save()

  await provider.interactionFinished(
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
}
