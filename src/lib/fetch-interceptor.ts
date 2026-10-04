import { AUTH_STORAGE_KEY, useAuthStore } from '@/stores/auth'

import {
    RETRY_CONFIG,
    computeBackoffDelay,
    isRetryableMethod,
    isRetryableStatus,
    sleep,
} from './retry'

const originalFetch = window.fetch

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
    const res = await originalFetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
        { method: 'POST', credentials: 'include' }
    )

    if (res.ok) {
        const body = await res.json()
        if (body.accessToken) {
            localStorage.setItem(AUTH_STORAGE_KEY, body.accessToken)
            return true
        }
    }

    return false
}

async function fetchMeAfterRefresh() {
    try {
        const authStore = useAuthStore()
        await authStore.fetchMe()
    } catch {
        // Ignore errors - the router guard will handle unauthenticated state
    }
}

function redirectToLogin() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    window.location.href = '/login'
}

window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const url =
        typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url

    if (url.includes('/auth/login') || url.includes('/auth/refresh-token')) {
        return originalFetch(input, init)
    }

    const token = localStorage.getItem(AUTH_STORAGE_KEY)

    const headers = new Headers(init?.headers)
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    const method =
        init?.method ?? (input instanceof Request ? input.method : 'GET')
    const maxAttempts = isRetryableMethod(method) ? RETRY_CONFIG.maxAttempts : 0

    let response: Response
    for (let attempt = 0; ; attempt++) {
        if (attempt > 0) {
            await sleep(computeBackoffDelay(attempt - 1))
        }

        try {
            response = await originalFetch(input, { ...init, headers })
        } catch (error) {
            const name = (error as { name?: string })?.name
            if (attempt >= maxAttempts || name === 'AbortError') {
                throw error
            }
            continue
        }

        if (attempt >= maxAttempts || !isRetryableStatus(response.status)) {
            break
        }
    }

    if (response.status === 401) {
        if (!refreshPromise) {
            refreshPromise = tryRefreshToken().finally(() => {
                refreshPromise = null
            })
        }

        const refreshed = await refreshPromise

        if (refreshed) {
            await fetchMeAfterRefresh()
            const newToken = localStorage.getItem(AUTH_STORAGE_KEY)
            const retryHeaders = new Headers(init?.headers)
            if (newToken) {
                retryHeaders.set('Authorization', `Bearer ${newToken}`)
            }
            return originalFetch(input, { ...init, headers: retryHeaders })
        }

        redirectToLogin()
    }

    return response
}
