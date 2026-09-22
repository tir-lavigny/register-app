import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StockLocationResource } from '@/api/model'

import { useStockLocationStore } from './stock-location'

const mockStockLocationsIndex = vi.fn()

vi.mock('@/api/generated/stock-location/stock-location', () => ({
    stockLocationsIndex: (...args: unknown[]) =>
        mockStockLocationsIndex(...args),
}))

const STORAGE_KEY = 'register_stock_location_id'

function makeLocation(
    overrides: Partial<StockLocationResource> = {}
): StockLocationResource {
    return {
        id: 1,
        name: 'Main',
        description: null,
        active: true,
        ...overrides,
    }
}

describe('stock location store', () => {
    let store: ReturnType<typeof useStockLocationStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        localStorage.clear()
        store = useStockLocationStore()
    })

    describe('initial state', () => {
        it('has empty locations', () => {
            expect(store.locations).toEqual([])
        })

        it('has null active location id', () => {
            expect(store.activeLocationId).toBeNull()
        })

        it('has null active location', () => {
            expect(store.activeLocation).toBeNull()
        })

        it('is not loading', () => {
            expect(store.loading).toBe(false)
        })
    })

    describe('loadFromStorage', () => {
        it('loads id from localStorage', () => {
            localStorage.setItem(STORAGE_KEY, '5')
            store.loadFromStorage()
            expect(store.activeLocationId).toBe(5)
        })

        it('does nothing if localStorage is empty', () => {
            store.loadFromStorage()
            expect(store.activeLocationId).toBeNull()
        })

        it('ignores invalid values in localStorage', () => {
            localStorage.setItem(STORAGE_KEY, 'not-a-number')
            store.loadFromStorage()
            expect(store.activeLocationId).toBeNull()
        })

        it('ignores NaN values', () => {
            localStorage.setItem(STORAGE_KEY, 'NaN')
            store.loadFromStorage()
            expect(store.activeLocationId).toBeNull()
        })
    })

    describe('setActiveLocation', () => {
        it('sets active location id', () => {
            store.setActiveLocation(3)
            expect(store.activeLocationId).toBe(3)
        })

        it('persists to localStorage', () => {
            store.setActiveLocation(3)
            expect(localStorage.getItem(STORAGE_KEY)).toBe('3')
        })

        it('updates active location when locations are loaded', () => {
            store.locations = [
                makeLocation({ id: 1, name: 'A' }),
                makeLocation({ id: 2, name: 'B' }),
            ]
            store.setActiveLocation(2)
            expect(store.activeLocation).toEqual(
                expect.objectContaining({ id: 2, name: 'B' })
            )
        })

        it('returns null activeLocation if id does not match any location', () => {
            store.locations = [makeLocation({ id: 1, name: 'A' })]
            store.setActiveLocation(99)
            expect(store.activeLocation).toBeNull()
        })
    })

    describe('activeLocation computed', () => {
        it('returns null when no locations', () => {
            store.activeLocationId = 1
            expect(store.activeLocation).toBeNull()
        })

        it('returns matching location', () => {
            store.locations = [makeLocation({ id: 1, name: 'A' })]
            store.activeLocationId = 1
            expect(store.activeLocation?.name).toBe('A')
        })
    })

    describe('fetchLocations', () => {
        it('fetches locations and sets them', async () => {
            const locations = [
                makeLocation({ id: 1, name: 'A' }),
                makeLocation({ id: 2, name: 'B' }),
            ]
            mockStockLocationsIndex.mockResolvedValue({
                data: { data: locations },
                status: 200,
            })

            await store.fetchLocations()

            expect(store.locations).toEqual(locations)
        })

        it('sets loading during fetch', async () => {
            mockStockLocationsIndex.mockImplementation(
                () => new Promise(() => {}) // never resolves
            )
            store.fetchLocations()
            expect(store.loading).toBe(true)
        })

        it('defaults to first location when activeLocationId is null', async () => {
            const locations = [
                makeLocation({ id: 10, name: 'First' }),
                makeLocation({ id: 20, name: 'Second' }),
            ]
            mockStockLocationsIndex.mockResolvedValue({
                data: { data: locations },
                status: 200,
            })

            await store.fetchLocations()

            expect(store.activeLocationId).toBe(10)
            expect(store.activeLocation?.name).toBe('First')
            expect(localStorage.getItem(STORAGE_KEY)).toBe('10')
        })

        it('does not override existing activeLocationId', async () => {
            store.activeLocationId = 20
            const locations = [
                makeLocation({ id: 10, name: 'First' }),
                makeLocation({ id: 20, name: 'Second' }),
            ]
            mockStockLocationsIndex.mockResolvedValue({
                data: { data: locations },
                status: 200,
            })

            await store.fetchLocations()

            expect(store.activeLocationId).toBe(20)
        })

        it('handles non-200 status without changing state', async () => {
            mockStockLocationsIndex.mockResolvedValue({
                data: { message: 'error' },
                status: 500,
            })

            await store.fetchLocations()

            expect(store.locations).toEqual([])
            expect(store.activeLocationId).toBeNull()
        })

        it('handles empty list without error', async () => {
            mockStockLocationsIndex.mockResolvedValue({
                data: { data: [] },
                status: 200,
            })

            await store.fetchLocations()

            expect(store.locations).toEqual([])
            expect(store.activeLocationId).toBeNull()
        })

        it('resets loading when done', async () => {
            mockStockLocationsIndex.mockResolvedValue({
                data: { data: [] },
                status: 200,
            })

            await store.fetchLocations()

            expect(store.loading).toBe(false)
        })

        it('resets loading on error', async () => {
            mockStockLocationsIndex.mockRejectedValue(new Error('network'))

            await expect(store.fetchLocations()).rejects.toThrow('network')

            expect(store.loading).toBe(false)
        })
    })
})
