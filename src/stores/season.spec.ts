import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSeasonStore } from './season'

const mockFetchCurrentSeason = vi.fn()

vi.mock('@/api/generated/season/season', () => ({
    registerSeasonsCurrent: (...args: unknown[]) =>
        mockFetchCurrentSeason(...args),
}))

describe('season store', () => {
    let store: ReturnType<typeof useSeasonStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        store = useSeasonStore()
    })

    describe('initial state', () => {
        it('has null season', () => {
            expect(store.currentSeason).toBeNull()
        })

        it('has null error', () => {
            expect(store.error).toBeNull()
        })

        it('is not loading', () => {
            expect(store.loading).toBe(false)
        })

        it('seasonId is null', () => {
            expect(store.seasonId).toBeNull()
        })
    })

    describe('fetchCurrentSeason', () => {
        it('sets season on 200', async () => {
            const fakeSeason = {
                id: 42,
                name: 'Summer 2026',
                start_date: '2026-06-01',
                end_date: '2026-09-30',
            }

            mockFetchCurrentSeason.mockResolvedValue({
                data: { data: fakeSeason },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchCurrentSeason()

            expect(store.currentSeason).toEqual(fakeSeason)
            expect(store.error).toBeNull()
            expect(store.seasonId).toBe(42)
        })

        it('sets error on 404', async () => {
            mockFetchCurrentSeason.mockResolvedValue({
                data: { data: null },
                status: 404,
                headers: new Headers(),
            })

            await store.fetchCurrentSeason()

            expect(store.currentSeason).toBeNull()
            expect(store.error).toBe(
                "Aucune saison active. Veuillez demander à un administrateur d'en créer une."
            )
            expect(store.seasonId).toBeNull()
        })

        it('sets generic error on unexpected status', async () => {
            mockFetchCurrentSeason.mockResolvedValue({
                data: {},
                status: 500,
                headers: new Headers(),
            })

            await store.fetchCurrentSeason()

            expect(store.currentSeason).toBeNull()
            expect(store.error).toBe('Une erreur inattendue est survenue.')
        })

        it('sets error on network failure', async () => {
            mockFetchCurrentSeason.mockRejectedValue(new Error('Network error'))

            await store.fetchCurrentSeason()

            expect(store.currentSeason).toBeNull()
            expect(store.error).toBe('Une erreur inattendue est survenue.')
        })

        it('sets loading to true during fetch and false after', async () => {
            mockFetchCurrentSeason.mockResolvedValue({
                data: {
                    data: {
                        id: 1,
                        name: 'S1',
                        start_date: '2026-01-01',
                        end_date: '2026-12-31',
                    },
                },
                status: 200,
                headers: new Headers(),
            })

            const loadingValues: boolean[] = []
            const unwatch = store.$subscribe(() => {
                loadingValues.push(store.loading)
            })

            await store.fetchCurrentSeason()
            unwatch()

            expect(loadingValues).toContain(true)
            expect(loadingValues[loadingValues.length - 1]).toBe(false)
        })
    })
})
