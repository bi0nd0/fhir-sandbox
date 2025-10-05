<template>
  <AuthLayout>
    <template #headline>Manage SMART session</template>
    <template #description>
      Use these controls to inspect or reset the sandbox login state between authorization code exchanges.
    </template>

    <section class="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-lg shadow-black/20 backdrop-blur">
      <div class="space-y-6">
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-white">End current SMART session</h2>
          <p class="text-base text-slate-300 text-balance">
            This action issues <code>POST /oauth2/logout</code> so the next authorization request prompts for credentials again.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
          :disabled="state.loading"
          @click="handleLogout"
        >
          {{ state.loading ? 'Signing out…' : 'End Session' }}
        </button>
        <p v-if="message" class="status" :data-variant="messageVariant">{{ message }}</p>
      </div>
    </section>

    <section class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-lg shadow-black/15 backdrop-blur">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Helpful notes</h2>
      <ul class="mt-4 space-y-4 text-sm text-slate-400">
        <li>Credentials are seeded from <code>data/auth/credentials.json</code>; edit that file to rotate accounts.</li>
        <li>After logging out, run through an `/oauth2/authorize` flow to authenticate as a different user.</li>
        <li>Need API-only sign-out? Issue a direct <code>POST /oauth2/logout</code> request and inspect the JSON response.</li>
      </ul>
    </section>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import AuthLayout from '../../layouts/AuthLayout.vue'
import { useAuthInteractionStore } from '../../stores/auth'

const store = useAuthInteractionStore()
const { state, logout } = store

const message = ref('')
const messageVariant = ref<'info' | 'success' | 'error'>('info')

const handleLogout = async () => {
  message.value = ''
  messageVariant.value = 'info'
  try {
    const result = await logout()
    if (result.status === 'logged-out') {
      message.value = 'Session cleared. Launch again to authenticate as a different user.'
      messageVariant.value = 'success'
    } else {
      message.value = 'No active session was found. You can start a fresh authorization flow.'
      messageVariant.value = 'info'
    }
  } catch (error) {
    console.error(error)
    message.value = error instanceof Error ? error.message : 'Logout failed'
    messageVariant.value = 'error'
  }
}
</script>
