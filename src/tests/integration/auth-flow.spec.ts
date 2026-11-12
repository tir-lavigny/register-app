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

const fakeUser = {
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
                user: fakeUser,
            })

            server.use(getLoginMockHandler(mockToken))

            const result = await store.login('test@example.com', 'password123')

            expect(result).toEqual({ success: true })
            expect(store.accessToken).toBe('test-access-token')
            expect(store.user).toEqual(fakeUser)
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

        it('returns access error on 403', async () => {
            server.use(
                http.post('*/auth/login', () =>
                    HttpResponse.json(
                        {
                            message: 'This account cannot access the register.',
                            errors: null,
                        },
                        { status: 403 }
                    )
                )
            )

            const result = await store.login('user@example.com', 'pass')

            expect(result).toEqual({
                success: false,
                error: 'This account cannot access the register.',
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
        it('updates token and fetches user on successful refresh', async () => {
            store.accessToken = 'old-token'
            store.user = { ...fakeUser }

            const newToken = getLoginResponseMock({
                accessToken: 'refreshed-token',
            })

            server.use(
                getRefreshMockHandler(newToken),
                http.get('*/auth/me', () =>
                    HttpResponse.json(
                        { data: { ...fakeUser, name: 'Refreshed User' } },
                        { status: 200 }
                    )
                )
            )

            await store.refreshAccessToken()

            expect(store.accessToken).toBe('refreshed-token')
            expect(store.user?.name).toBe('Refreshed User')
            expect(localStorage.getItem('access_token')).toBe('refreshed-token')
        })

        it('clears state on 401', async () => {
            store.accessToken = 'old-token'
            store.user = { ...fakeUser }
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
            store.user = { ...fakeUser }
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
            store.user = { ...fakeUser }

            server.use(http.post('*/auth/logout', () => HttpResponse.error()))

            await store.logout()

            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
        })
    })

    describe('hasRole', () => {
        it('returns true after login when user has the role', async () => {
            const mockToken = getLoginResponseMock({
                accessToken: 'token',
                user: fakeUser,
            })

            server.use(getLoginMockHandler(mockToken))

            await store.login('test@example.com', 'pass')

            expect(store.hasRole('admin')).toBe(true)
            expect(store.hasRole('editor')).toBe(true)
            expect(store.hasRole('superadmin')).toBe(false)
        })
    })

    describe('hasPermission', () => {
        it('returns true after login when a role has the permission', async () => {
            const mockToken = getLoginResponseMock({
                accessToken: 'token',
                user: fakeUser,
            })

            server.use(getLoginMockHandler(mockToken))

            await store.login('test@example.com', 'pass')

            expect(store.hasPermission('manage_users')).toBe(true)
            expect(store.hasPermission('edit_posts')).toBe(true)
            expect(store.hasPermission('delete_everything')).toBe(false)
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
                user: fakeUser,
            })
            const refreshToken = getLoginResponseMock({
                accessToken: 'refresh-token',
                user: fakeUser,
            })

            server.use(
                getLoginMockHandler(loginToken),
                getRefreshMockHandler(refreshToken)
            )

            const loginResult = await store.login('user@example.com', 'pass')
            expect(loginResult).toEqual({ success: true })
            expect(store.accessToken).toBe('login-token')
            expect(store.hasRole('admin')).toBe(true)

            await store.refreshAccessToken()
            expect(store.accessToken).toBe('refresh-token')

            await store.logout()
            expect(store.accessToken).toBeNull()
            expect(store.user).toBeNull()
            expect(localStorage.getItem('access_token')).toBeNull()
        })
    })
})
