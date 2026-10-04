import { HttpResponse, http } from 'msw'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../setup'

const API_URL = 'http://localhost:8000/api/retry-probe'

let fetch: typeof window.fetch

describe('fetch retry integration', () => {
    beforeAll(async () => {
        vi.resetModules()
        await import('@/lib/fetch-interceptor')
        fetch = window.fetch
    })

    beforeEach(() => {
        localStorage.clear()
    })

    it('retries GET after first 503 and returns the successful response', async () => {
        let calls = 0
        server.use(
            http.get('*/retry-probe', () => {
                calls++
                if (calls === 1) {
                    return HttpResponse.json(
                        { message: 'Service unavailable' },
                        { status: 503 }
                    )
                }
                return HttpResponse.json(
                    { data: { ok: true } },
                    { status: 200 }
                )
            })
        )

        const res = await fetch(API_URL)

        expect(calls).toBe(2)
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ data: { ok: true } })
    })

    it('sends four requests when every attempt returns 503', async () => {
        let calls = 0
        server.use(
            http.get('*/retry-probe', () => {
                calls++
                return HttpResponse.json(
                    { message: 'Service unavailable' },
                    { status: 503 }
                )
            })
        )

        const res = await fetch(API_URL)

        expect(calls).toBe(4)
        expect(res.status).toBe(503)
    })

    it('does not retry POST on 503', async () => {
        let calls = 0
        server.use(
            http.post('*/retry-probe', () => {
                calls++
                return HttpResponse.json(
                    { message: 'Service unavailable' },
                    { status: 503 }
                )
            })
        )

        const res = await fetch(API_URL, { method: 'POST' })

        expect(calls).toBe(1)
        expect(res.status).toBe(503)
    })
})
