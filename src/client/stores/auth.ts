import { defineStore } from 'pinia'
import { reactive } from 'vue'

import {
  fetchInteractionContext,
  logoutSession,
  submitInteractionLogin,
  type InteractionContext,
  type LoginPayload,
} from '../api/oauth'

export const useAuthInteractionStore = defineStore('auth-interaction', () => {
  const state = reactive({
    context: null as InteractionContext | null,
    loading: false,
    error: null as string | null,
    success: false,
    redirectTo: null as string | null,
  })

  const loadContext = async (uid: string) => {
    state.loading = true
    state.error = null
    state.success = false
    state.redirectTo = null
    try {
      state.context = await fetchInteractionContext(uid)
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to load interaction context'
    } finally {
      state.loading = false
    }
  }

  const submitCredentials = async (uid: string, payload: LoginPayload) => {
    state.loading = true
    state.error = null
    state.success = false
    state.redirectTo = null
    try {
      const response = await submitInteractionLogin(uid, payload)
      state.redirectTo = response.redirectTo
      state.success = true
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Authentication failed'
      throw error
    } finally {
      state.loading = false
    }
  }

  const logout = async () => {
    state.loading = true
    state.error = null
    try {
      return await logoutSession()
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Logout failed'
      throw error
    } finally {
      state.loading = false
    }
  }

  return {
    state,
    loadContext,
    submitCredentials,
    logout,
  }
})
