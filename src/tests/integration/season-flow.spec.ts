import { HttpResponse, http } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { getRegisterSeasonsCurrentMockHandler } from '@/api/generated/season/season.msw'
import { useSeasonStore } from '@/stores/season'

import { server } from '../setup'

const fakeSeason = {
    id: 42,
    name: 'Summer 2026',
    start_date: '2026-06-01',
    end_date: '2026-09-30',
}

describe('season flow integration', () => {
    let store: ReturnType<typeof useSeasonStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useSeasonStore()
    })

    describe('fetchCurrentSeason', () => {
        it('sets season on 200', async () => {
            server.use(
                getRegisterSeasonsCurrentMockHandler({
                    data: fakeSeason,
                })
            )

            await store.fetchCurrentSeason()

            expect(store.currentSeason).toEqual(fakeSeason)
            expect(store.seasonId).toBe(42)
            expect(store.error).toBeNull()
        })

        it('uses faker default when no override', async () => {
            server.use(getRegisterSeasonsCurrentMockHandler())

            await store.fetchCurrentSeason()

            expect(store.currentSeason).not.toBeNull()
            expect(store.currentSeason?.id).toBeDefined()
            expect(store.seasonId).toBe(store.currentSeason?.id)
        })

        it('sets error on 404', async () => {
            server.use(
                http.get('*/register/seasons/current', () =>
                    HttpResponse.json(
                        { message: 'No active season.', data: null },
                        { status: 404 }
                    )
                )
            )

            await store.fetchCurrentSeason()

            expect(store.currentSeason).toBeNull()
            expect(store.error).toBe(
                "Aucune saison active. Veuillez demander à un administrateur d'en créer une."
            )
            expect(store.seasonId).toBeNull()
        })

        it('sets generic error on 500', async () => {
            server.use(
                http.get('*/register/seasons/current', () =>
                    HttpResponse.json(
                        { message: 'Internal server error' },
                        { status: 500 }
                    )
                )
            )

            await store.fetchCurrentSeason()

            expect(store.currentSeason).toBeNull()
            expect(store.error).toBe('Une erreur inattendue est survenue.')
        })

        it('sets error on network failure', async () => {
            server.use(
                http.get('*/register/seasons/current', () =>
                    HttpResponse.error()
                )
            )

            await store.fetchCurrentSeason()

            expect(store.currentSeason).toBeNull()
            expect(store.error).toBe('Une erreur inattendue est survenue.')
        })

        it('toggles loading during fetch', async () => {
            server.use(getRegisterSeasonsCurrentMockHandler())

            const loadingValues: boolean[] = []
            const unwatch = store.$subscribe(() => {
                loadingValues.push(store.loading)
            })

            await store.fetchCurrentSeason()
            unwatch()

            expect(loadingValues).toContain(true)
            expect(loadingValues[loadingValues.length - 1]).toBe(false)
        })

        it('clears previous error on success', async () => {
            server.use(
                http.get('*/register/seasons/current', () =>
                    HttpResponse.json({ message: 'Not found' }, { status: 404 })
                )
            )

            await store.fetchCurrentSeason()
            expect(store.error).not.toBeNull()

            server.use(
                getRegisterSeasonsCurrentMockHandler({
                    data: fakeSeason,
                })
            )

            await store.fetchCurrentSeason()

            expect(store.error).toBeNull()
            expect(store.currentSeason).toEqual(fakeSeason)
        })
    })
})
