import { randomUUID } from 'node:crypto'
import { parse as legacyUrlParse } from 'node:url'

import Provider, { type Configuration } from 'oidc-provider'

type DynamicClient = {
  client_id: string
  client_secret: string
  redirect_uris: string[]
  response_types: string[]
  grant_types: string[]
  token_endpoint_auth_method: 'client_secret_basic' | 'client_secret_post'
}

const DEFAULT_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'online_access',
  'patient/*.read',
  'user/*.read',
  'system/*.read',
  'launch',
  'launch/patient',
  'launch/encounter',
]

export type ClientRegistration = {
  clientId: string
  redirectUri?: string
  clientSecret?: string
}

export type ProviderContext = {
  provider: Provider
  registerOrUpdateClient: (registration: ClientRegistration) => Promise<void>
}

const createDefaultClient = (clientId: string): DynamicClient => ({
  client_id: clientId,
  client_secret: randomUUID(),
  redirect_uris: [],
  response_types: ['code'],
  grant_types: ['authorization_code', 'refresh_token'],
  token_endpoint_auth_method: 'client_secret_basic',
})

export const createOidcProvider = (): ProviderContext => {
  const globalUrl = URL as unknown as { parse?: typeof legacyUrlParse }
  if (typeof globalUrl.parse !== 'function') {
    globalUrl.parse = legacyUrlParse
  }

  const issuer = process.env.OIDC_ISSUER ?? 'http://localhost:3000/oauth2'

  const configuration: Configuration = {
    clients: [],
    routes: {
      authorization: '/authorize',
      token: '/token',
    },
    async findAccount(_ctx, id) {
      return {
        accountId: id,
        async claims() {
          return { sub: id }
        },
      }
    },
    pkce: {
      required: () => false,
    },
    scopes: DEFAULT_SCOPES,
    cookies: {
      keys: [process.env.OIDC_COOKIE_KEY ?? 'smart-sandbox-secret'],
    },
    interactions: {
      url: (_ctx, interaction) => `/oauth2/interaction/${interaction.uid}`,
    },
    features: {
      devInteractions: { enabled: false },
      clientCredentials: { enabled: false },
      deviceFlow: { enabled: false },
      rpInitiatedLogout: { enabled: false },
      registration: { enabled: false },
      introspection: { enabled: false },
      revocation: { enabled: false },
    },
  }

  const provider = new Provider(issuer, configuration)
  const clientAdapter = (provider.Client as unknown as {
    adapter: {
      upsert: (clientId: string, payload: DynamicClient) => Promise<void>
    }
  }).adapter
  const registry = new Map<string, DynamicClient>()

  const registerOrUpdateClient = async ({
    clientId,
    redirectUri,
    clientSecret,
  }: ClientRegistration): Promise<void> => {
    const current = registry.get(clientId) ?? createDefaultClient(clientId)

    if (redirectUri && !current.redirect_uris.includes(redirectUri)) {
      current.redirect_uris.push(redirectUri)
    }

    if (clientSecret) {
      current.client_secret = clientSecret
    }

    if (!current.grant_types.includes('refresh_token')) {
      current.grant_types.push('refresh_token')
    }

    registry.set(clientId, current)
    await clientAdapter.upsert(clientId, current)
  }

  return { provider, registerOrUpdateClient }
}
