import { defineStore } from 'pinia'
import { computed, onMounted, reactive, watch } from 'vue'

import { deleteToken, fetchTokens, type TokenStatus, type TokenSummary } from '../api/adminTokens'

const STORAGE_KEY = 'sandbox-admin-token'

type AdminState = {
  adminToken: string
  status: TokenStatus
  typeFilter: string
  limit: number
  loading: boolean
  error: string | null
  tokens: TokenSummary[]
  removedCount: number
  lastFetched: number | null
}

export const useAdminTokensStore = defineStore('admin-tokens', () => {
  const state = reactive<AdminState>({
    adminToken: typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) ?? '' : '',
    status: 'active',
    typeFilter: '',
    limit: 100,
    loading: false,
    error: null,
    tokens: [],
    removedCount: 0,
    lastFetched: null,
  })

  const hasToken = computed(() => state.adminToken.trim().length > 0)
  const hasResults = computed(() => state.tokens.length > 0)

  const setAdminToken = (token: string) => {
    state.adminToken = token
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(STORAGE_KEY, token)
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }
  }

  const loadTokens = async () => {
    if (!hasToken.value) {
      state.tokens = []
      return
    }

    state.loading = true
    state.error = null

    try {
      const response = await fetchTokens(state.adminToken, {
        status: state.status,
        type: state.typeFilter || undefined,
        limit: state.limit,
      })
      state.tokens = response.data
      state.lastFetched = Date.now()
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unable to load tokens'
      state.tokens = []
    } finally {
      state.loading = false
    }
  }

  const setStatus = (status: TokenStatus) => {
    state.status = status
  }

  const setTypeFilter = (value: string) => {
    state.typeFilter = value
  }

  const setLimit = (value: number) => {
    state.limit = Number.isNaN(value) ? state.limit : Math.min(Math.max(value, 1), 500)
  }

  const clearError = () => {
    state.error = null
  }

  const revokeToken = async (id: string, cascade = false) => {
    if (!hasToken.value) return

    state.loading = true
    state.error = null

    try {
      const result = await deleteToken(state.adminToken, id, cascade)
      state.removedCount += result.removed
      await loadTokens()
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to revoke token'
    } finally {
      state.loading = false
    }
  }

  const resetFilters = () => {
    setStatus('active')
    setTypeFilter('')
    setLimit(100)
  }

  onMounted(() => {
    if (hasToken.value) {
      loadTokens()
    }
  })

  watch(
    () => [state.status, state.typeFilter, state.limit, state.adminToken],
    async ([_status, _type, _limit, token], [prevStatus, prevType, prevLimit, prevToken]) => {
      if (!token) {
        state.tokens = []
        return
      }

      const filtersChanged =
        _status !== prevStatus || _type !== prevType || _limit !== prevLimit || token !== prevToken

      if (filtersChanged && !state.loading) {
        await loadTokens()
      }
    },
  )

  return {
    state,
    hasToken,
    hasResults,
    setAdminToken,
    setStatus,
    setTypeFilter,
    setLimit,
    loadTokens,
    clearError,
    revokeToken,
    resetFilters,
  }
})
