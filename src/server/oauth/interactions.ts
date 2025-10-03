import type { IncomingMessage, ServerResponse } from 'node:http'

import type Provider from 'oidc-provider'

const AUTH_STYLESHEET_PATH = '/assets/oauth.css'

export type InteractionContext = {
  uid: string
  clientId?: string
  clientName?: string
  redirectUri?: string
  scopes: string[]
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return character
    }
  })

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

type BaseLayoutOptions = {
  title: string
  headline: string
  description: string
  content: string
}

const renderLayout = ({ title, headline, description, content }: BaseLayoutOptions): string => {
  const safeTitle = escapeHtml(title)
  const safeHeadline = escapeHtml(headline)
  const safeDescription = escapeHtml(description)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="${AUTH_STYLESHEET_PATH}" />
  </head>
  <body class="min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-16">
      <header class="pb-10">
        <p class="text-sm uppercase tracking-[0.3em] text-slate-400">SMART on FHIR Sandbox</p>
        <h1 class="mt-3 text-3xl font-semibold text-white">${safeHeadline}</h1>
        <p class="mt-2 text-base text-slate-300">${safeDescription}</p>
      </header>
      ${content}
      <footer class="pt-8 text-center text-xs text-slate-500">
        SMART on FHIR Sandbox · Tailwind UI surface
      </footer>
    </div>
  </body>
</html>`
}

export const renderInteractionPage = (
  context: InteractionContext & { errorMessage?: string; lastUsername?: string },
): string => {
  const clientLabel = context.clientName ?? context.clientId ?? 'the application'
  const errorBanner = context.errorMessage
    ? `<div class="rounded-md border border-red-600 bg-red-500/10 px-4 py-3 text-sm text-red-300">${escapeHtml(context.errorMessage)}</div>`
    : ''

  const scopeItems =
    context.scopes.length === 0
      ? '<li class="text-sm text-slate-300">No explicit scopes requested</li>'
      : context.scopes
          .map((scope) => `<li class="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-200">${escapeHtml(scope)}</li>`)
          .join('')

  const redirectSection = context.redirectUri
    ? `<p class="text-xs text-slate-400">After approval you will be redirected to <span class="font-mono text-slate-300">${escapeHtml(context.redirectUri)}</span>.</p>`
    : ''

  const usernameValue = context.lastUsername ? escapeHtml(context.lastUsername) : ''

  const content = `<main class="grid flex-1 gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-black/20 backdrop-blur">
          <form action="/oauth2/interaction/${encodeURIComponent(context.uid)}/login" method="post" class="space-y-6">
            <div>
              <label for="username" class="block text-sm font-medium text-slate-200">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value="${usernameValue}"
                autocomplete="username"
                required
                class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-base text-slate-100 shadow-inner shadow-black/30 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-slate-200">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-base text-slate-100 shadow-inner shadow-black/30 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
            ${errorBanner}
            <button
              type="submit"
              class="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              Sign In & Continue
            </button>
          </form>
        </section>
        <aside class="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/20 backdrop-blur">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Request summary</h2>
            <p class="mt-2 text-sm text-slate-400">
              ${escapeHtml(clientLabel)} is requesting the following SMART scopes:
            </p>
            <ul class="mt-4 flex flex-wrap gap-2">${scopeItems}</ul>
            ${redirectSection}
          </div>
          <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            <p class="font-semibold text-slate-200">Test credentials</p>
            <ul class="mt-2 space-y-1">
              <li><span class="font-medium text-slate-100">alice</span> / Wonderland!23</li>
              <li><span class="font-medium text-slate-100">bob</span> / Builder#42</li>
              <li><span class="font-medium text-slate-100">drjones</span> / HealThy123$</li>
            </ul>
            <p class="mt-3">Swap in your own store by updating <code>data/auth/credentials.json</code>.</p>
          </div>
        </aside>
      </main>`

  return renderLayout({
    title: `Sign in to ${clientLabel}`,
    headline: `Authorize ${clientLabel}`,
    description: 'Provide your sandbox credentials to continue with the SMART authorization flow.',
    content,
  })
}

export const finalizeInteraction = async (
  provider: Provider,
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  accountId: string,
): Promise<void> => {
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

export const renderSessionPage = (): string => {
  const content = `<main class="flex-1 space-y-8">
        <section class="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-lg shadow-black/20 backdrop-blur">
          <div class="space-y-6">
            <div class="space-y-3">
              <h2 class="text-lg font-semibold text-white">End current SMART session</h2>
              <p class="text-base text-slate-300 text-balance">
                This page calls <code>POST /oauth2/logout</code> so the next authorization request prompts
                for credentials again. Use it after testing a launch to switch accounts.
              </p>
            </div>
            <button id="logoutButton" type="button" class="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-slate-950 transition hover:bg-sky-400">
              End Session
            </button>
            <p id="logoutStatus" class="status text-sm" role="status" aria-live="polite"></p>
          </div>
        </section>
        <section class="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-lg shadow-black/15 backdrop-blur">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Helpful notes</h2>
          <ul class="mt-4 space-y-4 text-sm text-slate-400">
            <li>Credentials are seeded from <code>data/auth/credentials.json</code>; edit that file to rotate accounts.</li>
            <li>After logging out, run through a SMART /oauth2/authorize flow to authenticate as a different user.</li>
            <li>Need API-only sign-out? Issue a direct <code>POST /oauth2/logout</code> request and inspect the JSON response.</li>
          </ul>
        </section>
      </main>
      <script>
        const button = document.getElementById('logoutButton');
        const status = document.getElementById('logoutStatus');

        if (button && status) {
          const setStatus = (message, variant = 'info') => {
            status.textContent = message;
            status.setAttribute('data-variant', variant);
          };

          button.addEventListener('click', async () => {
            button.setAttribute('disabled', 'true');
            setStatus('Signing out…', 'info');

            try {
              const response = await fetch('/oauth2/logout', { method: 'POST' });
              if (!response.ok) {
                const detail = await response.text();
                const fallback = 'Logout failed with status ' + response.status;
                throw new Error(detail || fallback);
              }
              const payload = await response.json();
              if (payload.status === 'logged-out') {
                setStatus('Session cleared. Launch again to authenticate as a different user.', 'success');
              } else if (payload.status === 'no-active-session') {
                setStatus('No active session was found. You can start a fresh authorization flow.', 'info');
              } else {
                setStatus('Unexpected response: ' + JSON.stringify(payload), 'info');
              }
            } catch (error) {
              setStatus(error instanceof Error ? error.message : 'Unexpected logout error', 'error');
            } finally {
              button.removeAttribute('disabled');
            }
          });
        }
      </script>`

  return renderLayout({
    title: 'SMART session tools',
    headline: 'Manage SMART session',
    description:
      'Use these controls to inspect or reset the sandbox login state between authorization code exchanges.',
    content,
  })
}
