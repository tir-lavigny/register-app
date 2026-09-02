import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { loginResponse } from '@/api/generated/auth/auth'
import type { TokenResource, UserResource } from '@/api/model'

import { AUTH_STORAGE_KEY, useAuthStore } from './auth'

const mockLogin = vi.fn()
const mockRefresh = vi.fn()
const mockLogout = vi.fn()
const mockMe = vi.fn()

vi.mock('@/api/generated/auth/auth', () => ({
    login: (...args: unknown[]) => mockLogin(...args),
    refresh: (...args: unknown[]) => mockRefresh(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
    me: (...args: unknown[]) => mockMe(...args),
}))

const fakeUser: UserResource = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    roles: [
        {
            name: 'admin',
            permissions: [{ name: 'manage_users' }, { name: 'edit_posts' }],
        },
        {
            name: 'editor',
            permissions: [{ name: 'edit_posts' }],
        },
    ],
}

const fakeToken: TokenResource = {
    accessToken: 'fake-access-token-abc123',
    user: fakeUser,
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
            expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(
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
            store.user = { ...fakeUser }
            localStorage.setItem(AUTH_STORAGE_KEY, 'some-token')

            mockLogout.mockResolvedValue({
                data: undefined,
                status: 204,
                headers: new Headers(),
            })

            await store.logout()

            expect(mockLogout).toHaveBeenCalled()
            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
            expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
        })

        it('clears state even if API call fails', async () => {
            store.accessToken = 'some-token'
            store.user = { ...fakeUser }

            mockLogout.mockRejectedValue(new Error('Network error'))

            await store.logout()

            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
        })
    })

    describe('refreshAccessToken', () => {
        it('updates token and fetches user on successful refresh', async () => {
            store.accessToken = 'old-token'
            store.user = { ...fakeUser }

            mockRefresh.mockResolvedValue({
                data: { accessToken: 'new-refreshed-token' },
                status: 200,
                headers: new Headers(),
            })

            mockMe.mockResolvedValue({
                data: { data: { ...fakeUser, name: 'Refreshed User' } },
                status: 200,
                headers: new Headers(),
            })

            await store.refreshAccessToken()

            expect(store.accessToken).toBe('new-refreshed-token')
            expect(store.user?.name).toBe('Refreshed User')
            expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(
                'new-refreshed-token'
            )
        })

        it('clears state on 401 (refresh token expired)', async () => {
            store.accessToken = 'old-token'
            store.user = { ...fakeUser }
            localStorage.setItem(AUTH_STORAGE_KEY, 'old-token')

            mockRefresh.mockResolvedValue({
                data: { message: 'Token expired' },
                status: 401,
                headers: new Headers(),
            })

            await store.refreshAccessToken()

            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
            expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
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
            localStorage.setItem(AUTH_STORAGE_KEY, 'stored-token')

            store.loadFromStorage()

            expect(store.accessToken).toBe('stored-token')
        })

        it('does nothing if no token in localStorage', () => {
            store.loadFromStorage()

            expect(store.accessToken).toBeNull()
        })
    })

    describe('hasRole', () => {
        it('returns true when user has the role', () => {
            store.user = { ...fakeUser }

            expect(store.hasRole('admin')).toBe(true)
        })

        it('returns false when user does not have the role', () => {
            store.user = { ...fakeUser }

            expect(store.hasRole('superadmin')).toBe(false)
        })

        it('returns false when user is null', () => {
            expect(store.hasRole('admin')).toBe(false)
        })
    })

    describe('hasPermission', () => {
        it('returns true when a role has the permission', () => {
            store.user = { ...fakeUser }

            expect(store.hasPermission('manage_users')).toBe(true)
        })

        it('returns true when permission exists in a different role', () => {
            store.user = { ...fakeUser }

            expect(store.hasPermission('edit_posts')).toBe(true)
        })

        it('returns false when no role has the permission', () => {
            store.user = { ...fakeUser }

            expect(store.hasPermission('delete_everything')).toBe(false)
        })

        it('returns false when user is null', () => {
            expect(store.hasPermission('manage_users')).toBe(false)
        })
    })
})
