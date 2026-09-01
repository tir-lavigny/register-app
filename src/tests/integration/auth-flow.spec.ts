import { HttpResponse, http } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { getLoginResponseMock } from '@/api/generated/auth/auth.faker'
import {
    getLoginMockHandler,
    getRefreshMockHandler,
} from '@/api/generated/auth/auth.msw'
import { useAuthStore } from '@/stores/auth'

import { server } from '../setup'

describe('auth flow integration', () => {
    let store: ReturnType<typeof useAuthStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
        store = useAuthStore()
    })

    describe('login', () => {
        it('stores token and user on successful login', async () => {
            const mockToken = getLoginResponseMock({
                accessToken: 'test-access-token',
                user: { id: 1, email: 'test@example.com' },
            })

            server.use(getLoginMockHandler(mockToken))

            const result = await store.login('test@example.com', 'password123')

            expect(result).toEqual({ success: true })
            expect(store.accessToken).toBe('test-access-token')
            expect(store.user).toEqual({ id: 1, email: 'test@example.com' })
            expect(localStorage.getItem('access_token')).toBe(
                'test-access-token'
            )
        })

        it('returns error on 401', async () => {
            server.use(
                http.post('*/auth/login', () =>
                    HttpResponse.json(
                        { message: 'Wrong credentials.', errors: null },
                        { status: 401 }
                    )
                )
            )

            const result = await store.login('wrong@example.com', 'badpass')

            expect(result).toEqual({
                success: false,
                error: 'Wrong credentials.',
            })
            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
        })

        it('returns validation error on 422', async () => {
            server.use(
                http.post('*/auth/login', () =>
                    HttpResponse.json(
                        {
                            message: 'Validation failed',
                            errors: { email: ['The email is invalid.'] },
                        },
                        { status: 422 }
                    )
                )
            )

            const result = await store.login('invalid', 'pass')

            expect(result).toEqual({
                success: false,
                error: 'Validation failed',
            })
            expect(store.accessToken).toBeNull()
        })
    })

    describe('refreshAccessToken', () => {
        it('updates token on successful refresh', async () => {
            store.accessToken = 'old-token'
            store.user = { id: 1, email: 'old@example.com' }

            const newToken = getLoginResponseMock({
                accessToken: 'refreshed-token',
                user: { id: 1, email: 'refreshed@example.com' },
            })

            server.use(getRefreshMockHandler(newToken))

            await store.refreshAccessToken()

            expect(store.accessToken).toBe('refreshed-token')
            expect(store.user).toEqual({
                id: 1,
                email: 'refreshed@example.com',
            })
            expect(localStorage.getItem('access_token')).toBe('refreshed-token')
        })

        it('clears state on 401', async () => {
            store.accessToken = 'old-token'
            store.user = { id: 1, email: 'test@example.com' }
            localStorage.setItem('access_token', 'old-token')

            server.use(
                http.post('*/auth/refresh-token', () =>
                    HttpResponse.json(
                        { message: 'Token expired' },
                        { status: 401 }
                    )
                )
            )

            await store.refreshAccessToken()

            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
            expect(localStorage.getItem('access_token')).toBeNull()
        })
    })

    describe('logout', () => {
        it('clears state and calls API', async () => {
            store.accessToken = 'some-token'
            store.user = { id: 1, email: 'test@example.com' }
            localStorage.setItem('access_token', 'some-token')

            let handlerCalled = false
            server.use(
                http.post('*/auth/logout', () => {
                    handlerCalled = true
                    return new HttpResponse(null, { status: 204 })
                })
            )

            await store.logout()

            expect(handlerCalled).toBe(true)
            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
            expect(localStorage.getItem('access_token')).toBeNull()
        })

        it('clears state even on network error', async () => {
            store.accessToken = 'some-token'
            store.user = { id: 1, email: 'test@example.com' }

            server.use(http.post('*/auth/logout', () => HttpResponse.error()))

            await store.logout()

            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
        })
    })

    describe('loadFromStorage', () => {
        it('restores token from localStorage', () => {
            localStorage.setItem('access_token', 'stored-token')

            store.loadFromStorage()

            expect(store.accessToken).toBe('stored-token')
        })

        it('does nothing if no token in localStorage', () => {
            store.loadFromStorage()

            expect(store.accessToken).toBeNull()
        })
    })

    describe('full flow', () => {
        it('login → refresh → logout', async () => {
            const loginToken = getLoginResponseMock({
                accessToken: 'login-token',
                user: { id: 1, email: 'user@example.com' },
            })
            const refreshToken = getLoginResponseMock({
                accessToken: 'refresh-token',
                user: { id: 1, email: 'user@example.com' },
            })

            server.use(
                getLoginMockHandler(loginToken),
                getRefreshMockHandler(refreshToken)
            )

            const loginResult = await store.login('user@example.com', 'pass')
            expect(loginResult).toEqual({ success: true })
            expect(store.accessToken).toBe('login-token')

            await store.refreshAccessToken()
            expect(store.accessToken).toBe('refresh-token')

            await store.logout()
            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
            expect(localStorage.getItem('access_token')).toBeNull()
        })
    })
})
