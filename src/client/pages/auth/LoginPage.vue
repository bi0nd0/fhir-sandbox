<template>
  <AuthLayout>
    <template #headline>
      Authorize {{ displayName }}
    </template>
    <template #description>
      Provide your sandbox credentials to continue with the SMART authorization flow.
    </template>

    <div class="grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-black/20 backdrop-blur">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div>
            <label for="username" class="block text-sm font-medium text-slate-200">Username</label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              required
              class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-base text-slate-100 shadow-inner shadow-black/30 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-slate-200">Password</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              required
              class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-base text-slate-100 shadow-inner shadow-black/30 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
          <p v-if="state.error" class="rounded-md border border-red-600 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {{ state.error }}
          </p>
          <button
            type="submit"
            :disabled="state.loading"
            class="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
          >
            {{ state.loading ? 'Signing in…' : 'Sign In & Continue' }}
          </button>
        </form>
      </section>
      <aside class="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/20 backdrop-blur">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Request summary</h2>
          <p class="mt-2 text-sm text-slate-400">
            {{ displayName }} is requesting the following SMART scopes:
          </p>
          <ul class="mt-4 flex flex-wrap gap-2">
            <li
              v-for="scope in state.context?.scopes ?? []"
              :key="scope"
              class="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-200"
            >
              {{ scope }}
            </li>
            <li v-if="!state.context?.scopes?.length" class="text-sm text-slate-300">No explicit scopes requested</li>
          </ul>
          <p v-if="state.context?.redirectUri" class="mt-3 text-xs text-slate-400">
            After approval you will be redirected to
            <span class="font-mono text-slate-300">{{ state.context.redirectUri }}</span>.
          </p>
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
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'

import AuthLayout from '../../layouts/AuthLayout.vue'
import { useAuthInteractionStore } from '../../stores/auth'

const props = defineProps<{ uid: string }>()
const route = useRoute()
const store = useAuthInteractionStore()
const { state } = store

const form = reactive({
  username: '',
  password: '',
})

const resolveUid = computed(() => props.uid ?? (route.params.uid as string | undefined))

onMounted(() => {
  const uid = resolveUid.value
  if (uid) {
    store.loadContext(uid)
  }
})

watch(
  () => state.redirectTo,
  (redirect) => {
    if (redirect) {
      window.location.href = redirect
    }
  },
)

const displayName = computed(() => state.context?.clientName ?? state.context?.clientId ?? 'the application')

const handleSubmit = async () => {
  const uid = resolveUid.value
  if (!uid) {
    return
  }

  try {
    await store.submitCredentials(uid, { ...form })
  } catch (error) {
    // errors already surfaced in store state
    console.error(error)
  }
}
</script>
