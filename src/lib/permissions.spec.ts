import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/stores/auth'

import { hasPermission } from './permissions'

describe('hasPermission', () => {
    let authStore: ReturnType<typeof useAuthStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        authStore = useAuthStore()
    })

    it('returns true when user has the permission', () => {
        authStore.user = {
            id: 1,
            name: 'Test',
            email: 'test@test.com',
            roles: [
                {
                    name: 'admin',
                    permissions: [{ name: 'view register' }],
                },
            ],
        }

        expect(hasPermission('view register')).toBe(true)
    })

    it('returns false when user lacks the permission', () => {
        authStore.user = {
            id: 1,
            name: 'Test',
            email: 'test@test.com',
            roles: [
                {
                    name: 'user',
                    permissions: [{ name: 'other' }],
                },
            ],
        }

        expect(hasPermission('view register')).toBe(false)
    })

    it('returns false when user is null', () => {
        expect(hasPermission('view register')).toBe(false)
    })
})
