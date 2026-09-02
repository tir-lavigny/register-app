import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
    login as apiLogin,
    logout as apiLogout,
    refresh as apiRefresh,
} from '@/api/generated/auth/auth'
import type { UserResource } from '@/api/model'

export const AUTH_STORAGE_KEY = 'access_token'

export const useAuthStore = defineStore('auth', () => {
    const accessToken = ref<string | null>(null)
    const user = ref<UserResource | null>(null)

    function isLoggedIn() {
        return accessToken.value !== null
    }

    function setToken(token: string | null) {
        accessToken.value = token
        if (token) {
            localStorage.setItem(AUTH_STORAGE_KEY, token)
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY)
        }
    }

    function clearAuth() {
        setToken(null)
        user.value = null
    }

    async function login(
        email: string,
        password: string
    ): Promise<{ success: true } | { success: false; error: string }> {
        try {
            const response = await apiLogin({ email, password })

            if (response.status === 200) {
                setToken(response.data.accessToken)
                user.value = response.data.user
                return { success: true }
            }

            if (response.status === 401) {
                return { success: false, error: response.data.message }
            }

            if (response.status === 422) {
                return { success: false, error: response.data.message }
            }

            return { success: false, error: 'An unexpected error occurred' }
        } catch {
            return { success: false, error: 'An unexpected error occurred' }
        }
    }

    async function logout() {
        try {
            await apiLogout()
        } catch {
            // Clear state regardless of API success
        } finally {
            clearAuth()
        }
    }

    async function refreshAccessToken() {
        try {
            const response = await apiRefresh()

            if (response.status === 200) {
                setToken(response.data.accessToken)
                user.value = response.data.user
                return
            }

            clearAuth()
        } catch {
            clearAuth()
        }
    }

    function loadFromStorage() {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY)
        if (stored) {
            accessToken.value = stored
        }
    }

    function hasRole(name: string): boolean {
        return user.value?.roles.some((r) => r.name === name) ?? false
    }

    function hasPermission(name: string): boolean {
        return (
            user.value?.roles.some((r) =>
                r.permissions.some((p) => p.name === name)
            ) ?? false
        )
    }

    return {
        accessToken,
        user,
        isLoggedIn,
        login,
        logout,
        refreshAccessToken,
        loadFromStorage,
        hasRole,
        hasPermission,
    }
})
