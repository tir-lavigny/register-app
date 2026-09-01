import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { loginResponse } from '@/api/generated/auth/auth'
import type { TokenResource } from '@/api/model'

import { useAuthStore } from './auth'

const mockLogin = vi.fn()
const mockRefresh = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/api/generated/auth/auth', () => ({
    login: (...args: unknown[]) => mockLogin(...args),
    refresh: (...args: unknown[]) => mockRefresh(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
}))

const fakeToken: TokenResource = {
    accessToken: 'fake-access-token-abc123',
    user: { id: 1, email: 'test@example.com' },
}

describe('auth store', () => {
    let store: ReturnType<typeof useAuthStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        localStorage.clear()
        store = useAuthStore()
    })

    describe('isLoggedIn', () => {
        it('returns false when no token is stored', () => {
            expect(store.isLoggedIn()).toBe(false)
        })

        it('returns true when a token is stored', () => {
            store.accessToken = 'some-token'
            expect(store.isLoggedIn()).toBe(true)
        })
    })

    describe('login', () => {
        it('stores token and user on successful login', async () => {
            mockLogin.mockResolvedValue({
                data: fakeToken,
                status: 200,
                headers: new Headers(),
            })

            const result = await store.login('test@example.com', 'password123')

            expect(result).toEqual({ success: true })
            expect(store.accessToken).toBe(fakeToken.accessToken)
            expect(store.user).toEqual(fakeToken.user)
            expect(localStorage.getItem('access_token')).toBe(
                fakeToken.accessToken
            )
        })

        it('returns error message on 401', async () => {
            mockLogin.mockResolvedValue({
                data: { message: 'Wrong credentials.' as const, errors: null },
                status: 401,
                headers: new Headers(),
            })

            const result = await store.login('wrong@example.com', 'badpass')

            expect(result).toEqual({
                success: false,
                error: 'Wrong credentials.',
            })
            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
        })

        it('returns validation errors on 422', async () => {
            mockLogin.mockResolvedValue({
                data: {
                    message: 'Validation failed',
                    errors: { email: ['The email is invalid.'] },
                },
                status: 422,
                headers: new Headers(),
            })

            const result = await store.login('invalid', 'pass')

            expect(result).toEqual({
                success: false,
                error: 'Validation failed',
            })
            expect(store.accessToken).toBeNull()
        })

        it('returns generic error on unexpected status', async () => {
            mockLogin.mockResolvedValue({
                data: {} as loginResponse['data'],
                status: 500,
                headers: new Headers(),
            })

            const result = await store.login('test@example.com', 'pass')

            expect(result).toEqual({
                success: false,
                error: 'An unexpected error occurred',
            })
        })
    })

    describe('logout', () => {
        it('clears state and calls API', async () => {
            store.accessToken = 'some-token'
            store.user = { id: 1, email: 'test@example.com' }
            localStorage.setItem('access_token', 'some-token')

            mockLogout.mockResolvedValue({
                data: undefined,
                status: 204,
                headers: new Headers(),
            })

            await store.logout()

            expect(mockLogout).toHaveBeenCalled()
            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
            expect(localStorage.getItem('access_token')).toBeNull()
        })

        it('clears state even if API call fails', async () => {
            store.accessToken = 'some-token'
            store.user = { id: 1, email: 'test@example.com' }

            mockLogout.mockRejectedValue(new Error('Network error'))

            await store.logout()

            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
        })
    })

    describe('refreshAccessToken', () => {
        it('updates token on successful refresh', async () => {
            store.accessToken = 'old-token'
            store.user = { id: 1, email: 'old@example.com' }

            const newToken: TokenResource = {
                accessToken: 'new-refreshed-token',
                user: { id: 1, email: 'new@example.com' },
            }

            mockRefresh.mockResolvedValue({
                data: newToken,
                status: 200,
                headers: new Headers(),
            })

            await store.refreshAccessToken()

            expect(store.accessToken).toBe(newToken.accessToken)
            expect(store.user).toEqual(newToken.user)
            expect(localStorage.getItem('access_token')).toBe(
                newToken.accessToken
            )
        })

        it('clears state on 401 (refresh token expired)', async () => {
            store.accessToken = 'old-token'
            store.user = { id: 1, email: 'test@example.com' }
            localStorage.setItem('access_token', 'old-token')

            mockRefresh.mockResolvedValue({
                data: { message: 'Token expired' },
                status: 401,
                headers: new Headers(),
            })

            await store.refreshAccessToken()

            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
            expect(localStorage.getItem('access_token')).toBeNull()
        })

        it('clears state on network error', async () => {
            store.accessToken = 'old-token'

            mockRefresh.mockRejectedValue(new Error('Network error'))

            await store.refreshAccessToken()

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
})
