<template>
  <AdminLayout>
    <section class="space-y-8">
      <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-black/10 backdrop-blur">
        <h2 class="text-lg font-semibold text-white">Authenticate</h2>
        <p class="mt-2 text-sm text-slate-400">
          Provide the admin token (`SANDBOX_ADMIN_TOKEN`) to interact with the token registry API.
        </p>
        <form class="mt-4 flex flex-col gap-4 md:flex-row" @submit.prevent="submitToken">
          <input
            v-model="tokenInput"
            type="password"
            placeholder="Admin token"
            class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-base text-slate-100 shadow-inner shadow-black/20 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
          />
          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              Apply
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              @click="clearToken"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/15 backdrop-blur">
        <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-white">Stored tokens</h2>
            <p class="text-xs uppercase tracking-wide text-slate-400">
              {{ state.tokens.length }} results · {{ state.removedCount }} removed this session
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <select
              v-model="state.status"
              class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="consumed">Consumed</option>
              <option value="all">All</option>
            </select>
            <input
              v-model="state.typeFilter"
              type="text"
              placeholder="Filter by type (e.g. RefreshToken)"
              class="w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
            <input
              v-model.number="state.limit"
              type="number"
              min="1"
              max="500"
              class="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
            <button
              type="button"
              class="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              @click="resetFilters"
            >
              Reset
            </button>
            <button
              type="button"
              class="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
              :disabled="state.loading || !hasToken"
              @click="loadTokens"
            >
              Refresh
            </button>
          </div>
        </header>

        <p v-if="!hasToken" class="mt-6 text-sm text-slate-400">
          Provide an admin token to view stored OAuth artifacts.
        </p>

        <p v-if="state.error" class="mt-6 rounded-md border border-red-600 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ state.error }}
        </p>

        <div v-if="state.tokens.length" class="mt-6 overflow-hidden rounded-xl border border-slate-800">
          <table class="min-w-full divide-y divide-slate-800 text-sm">
            <thead class="bg-slate-900/70 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th class="px-4 py-3 text-left">ID</th>
                <th class="px-4 py-3 text-left">Type</th>
                <th class="px-4 py-3 text-left">Account</th>
                <th class="px-4 py-3 text-left">Client</th>
                <th class="px-4 py-3 text-left">Expires</th>
                <th class="px-4 py-3 text-left">Consumed</th>
                <th class="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-900 bg-slate-950/60">
              <tr v-for="token in state.tokens" :key="token.id" class="transition hover:bg-slate-900/80">
                <td class="px-4 py-3 font-mono text-xs text-slate-300 break-all">{{ token.id }}</td>
                <td class="px-4 py-3 text-slate-200">{{ token.type }}</td>
                <td class="px-4 py-3 text-slate-300">{{ token.payload.accountId ?? '—' }}</td>
                <td class="px-4 py-3 text-slate-300">{{ token.payload.clientId ?? '—' }}</td>
                <td class="px-4 py-3 text-slate-300">{{ formatTimestamp(token.expiresAt) }}</td>
                <td class="px-4 py-3 text-slate-300">{{ token.consumedAt ? formatTimestamp(token.consumedAt) : '—' }}</td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-800"
                      @click="showPayload(token)"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-amber-500 px-3 py-1 text-xs text-amber-300 transition hover:bg-amber-500/20"
                      :disabled="state.loading"
                      @click="revoke(token.id, false)"
                    >
                      Revoke
                    </button>
                    <button
                      v-if="token.grantId"
                      type="button"
                      class="rounded-lg border border-red-500 px-3 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
                      :disabled="state.loading"
                      @click="revoke(token.id, true)"
                    >
                      Revoke Grant
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="state.loading" class="mt-4 text-sm text-slate-400">Loading tokens…</p>
        <p v-else-if="hasToken && !state.tokens.length && !state.error" class="mt-4 text-sm text-slate-400">
          No tokens match the current filters.
        </p>
      </div>

      <div v-if="selectedPayload" class="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/15 backdrop-blur">
        <div class="flex items-center justify-between pb-4">
          <h2 class="text-lg font-semibold text-white">Token payload</h2>
          <button
            type="button"
            class="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-800"
            @click="selectedPayload = null"
          >
            Close
          </button>
        </div>
        <pre class="overflow-x-auto rounded-xl bg-slate-950/80 p-4 text-xs text-slate-200"><code>{{ formattedPayload }}</code></pre>
      </div>
    </section>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import AdminLayout from '../../layouts/AdminLayout.vue'
import { useAdminTokensStore } from '../../stores/adminTokens'

const store = useAdminTokensStore()
const { state, hasToken, setAdminToken, loadTokens, revokeToken, resetFilters } = store

const tokenInput = ref(state.adminToken)
const selectedPayload = ref<Record<string, unknown> | null>(null)

const submitToken = () => {
  setAdminToken(tokenInput.value.trim())
  if (tokenInput.value.trim()) {
    loadTokens()
  }
}

const clearToken = () => {
  tokenInput.value = ''
  setAdminToken('')
}

const revoke = (id: string, cascade: boolean) => {
  revokeToken(id, cascade)
}

const showPayload = (token: typeof state.tokens[number]) => {
  selectedPayload.value = token.payload
}

const formattedPayload = computed(() =>
  selectedPayload.value ? JSON.stringify(selectedPayload.value, null, 2) : '',
)

const formatTimestamp = (value: number | null) => {
  if (!value) return '—'
  const date = new Date(value * 1000)
  return date.toLocaleString()
}
</script>
