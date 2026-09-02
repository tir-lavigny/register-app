import { AUTH_STORAGE_KEY } from '@/stores/auth'

const originalFetch = window.fetch

window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
): Promise<Response> {
    const token = localStorage.getItem(AUTH_STORAGE_KEY)

    const headers = new Headers(init?.headers)
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    return originalFetch(input, { ...init, headers })
}
