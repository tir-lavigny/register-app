import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

vi.mock('@/stores/auth', () => ({
    AUTH_STORAGE_KEY: 'auth_token',
    useAuthStore: () => ({ fetchMe: vi.fn() }),
}))

async function loadInterceptor(): Promise<typeof window.fetch> {
    vi.resetModules()
    window.fetch = mockFetch as unknown as typeof fetch
    await import('./fetch-interceptor')
    return window.fetch
}

describe('fetch interceptor retry', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        localStorage.clear()
        window.fetch = mockFetch as unknown as typeof fetch
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('retries GET on 503 and returns the successful response', async () => {
        mockFetch
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }))

        const fetch = await loadInterceptor()
        const promise = fetch('/api/products')
        await vi.runAllTimersAsync()
        const res = await promise

        expect(mockFetch).toHaveBeenCalledTimes(2)
        expect(res.status).toBe(200)
    })

    it('returns the last 500 after exhausting retries', async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 500 }))

        const fetch = await loadInterceptor()
        const promise = fetch('/api/products')
        await vi.runAllTimersAsync()
        const res = await promise

        expect(mockFetch).toHaveBeenCalledTimes(4)
        expect(res.status).toBe(500)
    })

    it('retries GET on network error', async () => {
        mockFetch
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }))

        const fetch = await loadInterceptor()
        const promise = fetch('/api/products')
        await vi.runAllTimersAsync()
        const res = await promise

        expect(mockFetch).toHaveBeenCalledTimes(2)
        expect(res.status).toBe(200)
    })

    it('rethrows network error after exhausting retries', async () => {
        mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

        const fetch = await loadInterceptor()
        const promise = fetch('/api/products')
        const assertion = expect(promise).rejects.toThrow('Failed to fetch')
        await vi.runAllTimersAsync()
        await assertion

        expect(mockFetch).toHaveBeenCalledTimes(4)
    })

    it('does not retry on AbortError', async () => {
        const abortError = new DOMException('Aborted', 'AbortError')
        mockFetch.mockRejectedValue(abortError)

        const fetch = await loadInterceptor()
        await expect(fetch('/api/products')).rejects.toThrow(abortError)
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry POST on 500', async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 500 }))

        const fetch = await loadInterceptor()
        const res = await fetch('/api/tickets', { method: 'POST' })

        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(res.status).toBe(500)
    })

    it('does not retry GET on 404', async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 404 }))

        const fetch = await loadInterceptor()
        const res = await fetch('/api/season')

        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(res.status).toBe(404)
    })

    it('injects auth header on every retried attempt', async () => {
        localStorage.setItem('auth_token', 'tok')
        mockFetch
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }))

        const fetch = await loadInterceptor()
        const promise = fetch('/api/products')
        await vi.runAllTimersAsync()
        await promise

        const firstHeaders = new Headers(
            (mockFetch.mock.calls[0][1] as RequestInit).headers
        )
        const secondHeaders = new Headers(
            (mockFetch.mock.calls[1][1] as RequestInit).headers
        )
        expect(firstHeaders.get('Authorization')).toBe('Bearer tok')
        expect(secondHeaders.get('Authorization')).toBe('Bearer tok')
    })

    it('keeps 401 refresh flow separate from backoff', async () => {
        localStorage.setItem('auth_token', 'old')
        mockFetch
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ accessToken: 'new' }), {
                    status: 200,
                })
            )
            .mockResolvedValueOnce(new Response('ok', { status: 200 }))

        const fetch = await loadInterceptor()
        const promise = fetch('/api/me')
        await vi.runAllTimersAsync()
        const res = await promise

        expect(res.status).toBe(200)
        expect(mockFetch).toHaveBeenCalledTimes(3)

        const refreshCall = mockFetch.mock.calls[1]
        expect(String(refreshCall[0])).toContain('/auth/refresh-token')

        const finalHeaders = new Headers(
            (mockFetch.mock.calls[2][1] as RequestInit).headers
        )
        expect(finalHeaders.get('Authorization')).toBe('Bearer new')
    })
})
