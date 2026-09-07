import { HttpResponse, http } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { getLoginResponseMock } from '@/api/generated/auth/auth.faker'
import { getLoginMockHandler } from '@/api/generated/auth/auth.msw'
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
    ],
}

describe('auth fetchMe flow integration', () => {
    let store: ReturnType<typeof useAuthStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
        store = useAuthStore()
    })

    describe('fetchMe', () => {
        it('sets user and returns true on 200', async () => {
            server.use(
                http.get('*/auth/me', () =>
                    HttpResponse.json(
                        { data: { ...fakeUser } },
                        { status: 200 }
                    )
                )
            )

            store.accessToken = 'some-token'
            const result = await store.fetchMe()

            expect(result).toBe(true)
            expect(store.user).toEqual(fakeUser)
        })

        it('clears auth and returns false on 401', async () => {
            server.use(
                http.get('*/auth/me', () =>
                    HttpResponse.json(
                        { message: 'Unauthenticated.' },
                        { status: 401 }
                    )
                )
            )

            store.accessToken = 'some-token'
            store.user = { ...fakeUser }

            const result = await store.fetchMe()

            expect(result).toBe(false)
            expect(store.user).toBeNull()
            expect(store.accessToken).toBeNull()
        })

        it('clears auth and returns false on network error', async () => {
            server.use(http.get('*/auth/me', () => HttpResponse.error()))

            store.accessToken = 'some-token'
            store.user = { ...fakeUser }

            const result = await store.fetchMe()

            expect(result).toBe(false)
            expect(store.user).toBeNull()
            expect(store.accessToken).toBeNull()
        })

        it('updates user data after login', async () => {
            const loginToken = getLoginResponseMock({
                accessToken: 'login-token',
                user: fakeUser,
            })
            server.use(getLoginMockHandler(loginToken))

            await store.login('test@example.com', 'pass')
            expect(store.user).toEqual(fakeUser)

            const updatedUser = { ...fakeUser, name: 'Updated User' }
            server.use(
                http.get('*/auth/me', () =>
                    HttpResponse.json({ data: updatedUser }, { status: 200 })
                )
            )

            const result = await store.fetchMe()

            expect(result).toBe(true)
            expect(store.user?.name).toBe('Updated User')
        })
    })

    describe('login + fetchMe combined flow', () => {
        it('login then verify user via fetchMe', async () => {
            const loginToken = getLoginResponseMock({
                accessToken: 'token',
                user: fakeUser,
            })
            server.use(getLoginMockHandler(loginToken))

            const loginResult = await store.login('test@example.com', 'pass')
            expect(loginResult).toEqual({ success: true })
            expect(store.isLoggedIn()).toBe(true)

            server.use(
                http.get('*/auth/me', () =>
                    HttpResponse.json(
                        { data: { ...fakeUser, roles: fakeUser.roles } },
                        { status: 200 }
                    )
                )
            )

            const fetchResult = await store.fetchMe()
            expect(fetchResult).toBe(true)
            expect(store.hasRole('admin')).toBe(true)
            expect(store.hasPermission('manage_users')).toBe(true)
        })
    })
})
