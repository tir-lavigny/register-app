import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OperatingDayResource, TicketResource } from '@/api/model'

import { useOperatingDayStore } from './operating-day'

const mockFetchCurrent = vi.fn()
const mockFetchPreviousUnclosed = vi.fn()
const mockStore = vi.fn()
const mockUpdate = vi.fn()
const mockShow = vi.fn()

vi.mock('@/api/generated/operating-day/operating-day', () => ({
    registerOperatingDaysCurrent: (...args: unknown[]) =>
        mockFetchCurrent(...args),
    registerOperatingDaysPreviousUnclosed: (...args: unknown[]) =>
        mockFetchPreviousUnclosed(...args),
    registerOperatingDaysStore: (...args: unknown[]) => mockStore(...args),
    registerOperatingDaysUpdate: (...args: unknown[]) => mockUpdate(...args),
    registerOperatingDaysShow: (...args: unknown[]) => mockShow(...args),
}))

function makeTicket(
    overrides: Partial<TicketResource> & { id: number }
): TicketResource {
    return {
        total: '10.00',
        payment_method: 'cash',
        operating_day_id: 1,
        member_id: null,
        sold_at: '2026-09-02T10:00:00Z',
        deleted_at: null,
        created_at: null,
        updated_at: null,
        ...overrides,
    }
}

function makeDay(
    overrides: Partial<OperatingDayResource> & { id: number }
): OperatingDayResource {
    return {
        date: '2026-09-02',
        started_at: '2026-09-02T08:00:00Z',
        closed_at: null,
        season_id: 1,
        cash_remark: null,
        closing_balance: null,
        total_cash: '0.00',
        total_twint: '0.00',
        created_at: null,
        updated_at: null,
        tickets: [],
        ...overrides,
    }
}

describe('operatingDay store', () => {
    let store: ReturnType<typeof useOperatingDayStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        store = useOperatingDayStore()
    })

    describe('initial state', () => {
        it('has null currentDay', () => {
            expect(store.currentDay).toBeNull()
        })

        it('is not loading', () => {
            expect(store.loading).toBe(false)
        })

        it('isOpen is false', () => {
            expect(store.isOpen).toBe(false)
        })

        it('dayId is null', () => {
            expect(store.dayId).toBeNull()
        })

        it('activeTickets is empty', () => {
            expect(store.activeTickets).toEqual([])
        })

        it('canceledTickets is empty', () => {
            expect(store.canceledTickets).toEqual([])
        })

        it('cashTotal is 0', () => {
            expect(store.cashTotal).toBe(0)
        })

        it('twintTotal is 0', () => {
            expect(store.twintTotal).toBe(0)
        })
    })

    describe('fetchCurrentDay', () => {
        it('sets currentDay on 200', async () => {
            const fakeDay = makeDay({
                id: 1,
                tickets: [makeTicket({ id: 10, total: '25.00' })],
            })
            mockFetchCurrent.mockResolvedValue({
                data: { data: fakeDay },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchCurrentDay()

            expect(store.currentDay).toEqual(fakeDay)
            expect(store.isOpen).toBe(true)
            expect(store.dayId).toBe(1)
        })

        it('sets currentDay to null on 404', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { message: 'No open operating day for today.' },
                status: 404,
                headers: new Headers(),
            })

            await store.fetchCurrentDay()

            expect(store.currentDay).toBeNull()
            expect(store.isOpen).toBe(false)
        })

        it('sets loading during fetch', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })

            const loadingValues: boolean[] = []
            const unwatch = store.$subscribe(() => {
                loadingValues.push(store.loading)
            })

            await store.fetchCurrentDay()
            unwatch()

            expect(loadingValues).toContain(true)
            expect(loadingValues[loadingValues.length - 1]).toBe(false)
        })
    })

    describe('tickets computed', () => {
        it('filters active tickets', async () => {
            const day = makeDay({
                id: 1,
                tickets: [
                    makeTicket({ id: 10, deleted_at: null }),
                    makeTicket({ id: 11, deleted_at: '2026-09-02T12:00:00Z' }),
                    makeTicket({ id: 12, deleted_at: null }),
                ],
            })
            mockFetchCurrent.mockResolvedValue({
                data: { data: day },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchCurrentDay()

            expect(store.activeTickets).toHaveLength(2)
            expect(store.activeTickets.map((t) => t.id)).toEqual([10, 12])
        })

        it('filters canceled tickets', async () => {
            const day = makeDay({
                id: 1,
                tickets: [
                    makeTicket({ id: 10, deleted_at: null }),
                    makeTicket({ id: 11, deleted_at: '2026-09-02T12:00:00Z' }),
                ],
            })
            mockFetchCurrent.mockResolvedValue({
                data: { data: day },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchCurrentDay()

            expect(store.canceledTickets).toHaveLength(1)
            expect(store.canceledTickets[0].id).toBe(11)
        })

        it('computes cashTotal correctly', async () => {
            const day = makeDay({
                id: 1,
                tickets: [
                    makeTicket({
                        id: 10,
                        total: '25.00',
                        payment_method: 'cash',
                    }),
                    makeTicket({
                        id: 11,
                        total: '15.50',
                        payment_method: 'twint',
                    }),
                    makeTicket({
                        id: 12,
                        total: '10.00',
                        payment_method: 'cash',
                    }),
                    makeTicket({
                        id: 13,
                        total: '5.00',
                        payment_method: 'cash',
                        deleted_at: '2026-09-02T12:00:00Z',
                    }),
                ],
            })
            mockFetchCurrent.mockResolvedValue({
                data: { data: day },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchCurrentDay()

            expect(store.cashTotal).toBe(35)
        })

        it('computes twintTotal correctly', async () => {
            const day = makeDay({
                id: 1,
                tickets: [
                    makeTicket({
                        id: 10,
                        total: '25.00',
                        payment_method: 'cash',
                    }),
                    makeTicket({
                        id: 11,
                        total: '15.50',
                        payment_method: 'twint',
                    }),
                    makeTicket({
                        id: 12,
                        total: '10.00',
                        payment_method: 'twint',
                    }),
                ],
            })
            mockFetchCurrent.mockResolvedValue({
                data: { data: day },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchCurrentDay()

            expect(store.twintTotal).toBe(25.5)
        })
    })

    describe('createDay', () => {
        it('creates day on 201', async () => {
            const fakeDay = makeDay({ id: 5, season_id: 42 })
            mockStore.mockResolvedValue({
                data: { data: fakeDay },
                status: 201,
                headers: new Headers(),
            })

            const result = await store.createDay(42)

            expect(result).toEqual({ success: true })
            expect(store.currentDay).toEqual(fakeDay)
            expect(store.isOpen).toBe(true)
        })

        it('returns error if day already open', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            const result = await store.createDay(1)

            expect(result).toEqual({
                success: false,
                error: 'Une journée est déjà ouverte.',
            })
            expect(mockStore).not.toHaveBeenCalled()
        })

        it('returns validation errors on 422', async () => {
            mockStore.mockResolvedValue({
                data: {
                    message: 'Validation failed',
                    errors: { season_id: ['The season id field is required.'] },
                },
                status: 422,
                headers: new Headers(),
            })

            const result = await store.createDay(42)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error).toBe('Validation failed')
                expect(result.errors).toEqual({
                    season_id: ['The season id field is required.'],
                })
            }
        })

        it('returns error on network failure', async () => {
            mockStore.mockRejectedValue(new Error('Network error'))

            const result = await store.createDay(42)

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
        })
    })

    describe('closeDay', () => {
        it('closes day on 200', async () => {
            const openDay = makeDay({ id: 1, closed_at: null })
            mockFetchCurrent.mockResolvedValue({
                data: { data: openDay },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            const closedDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
                total_cash: '245.00',
                total_twint: '87.50',
            })
            mockUpdate.mockResolvedValue({
                data: { data: closedDay },
                status: 200,
                headers: new Headers(),
            })
            // After close, fetchCurrentDay returns the closed day from server
            mockFetchCurrent.mockResolvedValue({
                data: { data: closedDay },
                status: 200,
                headers: new Headers(),
            })

            const result = await store.closeDay(undefined, 'Extra CHF 5 found')

            expect(result.success).toBe(true)
            expect(store.currentDay).toEqual(closedDay)
            expect(store.isOpen).toBe(false)
            if (result.success) {
                expect(result.data.total_cash).toBe('245.00')
            }
        })

        it('sends cash_remark to API', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            mockUpdate.mockResolvedValue({
                data: {
                    data: makeDay({ id: 1, closed_at: '2026-09-02T18:00:00Z' }),
                },
                status: 200,
                headers: new Headers(),
            })

            await store.closeDay(undefined, 'Missing CHF 2')

            expect(mockUpdate).toHaveBeenCalledWith(
                1,
                { 'Idempotency-Key': expect.any(String) },
                {
                    status: 'closed',
                    cash_remark: 'Missing CHF 2',
                }
            )
        })

        it('sends null cash_remark when no remark', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            mockUpdate.mockResolvedValue({
                data: {
                    data: makeDay({ id: 1, closed_at: '2026-09-02T18:00:00Z' }),
                },
                status: 200,
                headers: new Headers(),
            })

            await store.closeDay()

            expect(mockUpdate).toHaveBeenCalledWith(
                1,
                { 'Idempotency-Key': expect.any(String) },
                {
                    status: 'closed',
                    cash_remark: null,
                }
            )
        })

        it('returns error if no day open', async () => {
            const result = await store.closeDay()

            expect(result).toEqual({
                success: false,
                error: 'Aucune journée à fermer.',
            })
        })

        it('returns error on network failure', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            mockUpdate.mockRejectedValue(new Error('Network error'))

            const result = await store.closeDay()

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
            expect(store.currentDay).not.toBeNull()
        })
    })

    describe('reopenDay', () => {
        it('reopens day on 200', async () => {
            const closedDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
            })
            mockFetchCurrent.mockResolvedValue({
                data: { data: closedDay },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()
            store.currentDay = closedDay

            const reopenedDay = makeDay({ id: 1, closed_at: null })
            mockUpdate.mockResolvedValue({
                data: { data: reopenedDay },
                status: 200,
                headers: new Headers(),
            })
            // After reopen, fetchCurrentDay returns the reopened day from server
            mockFetchCurrent.mockResolvedValue({
                data: { data: reopenedDay },
                status: 200,
                headers: new Headers(),
            })

            const result = await store.reopenDay()

            expect(result).toEqual({ success: true })
            expect(store.currentDay).toEqual(reopenedDay)
            expect(store.isOpen).toBe(true)
        })

        it('sends open status to API', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            mockUpdate.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })

            await store.reopenDay()

            expect(mockUpdate).toHaveBeenCalledWith(
                1,
                { 'Idempotency-Key': expect.any(String) },
                { status: 'open' }
            )
        })

        it('returns error if no dayId', async () => {
            const result = await store.reopenDay()

            expect(result).toEqual({
                success: false,
                error: 'Aucune journée refermée.',
            })
        })

        it('returns error on network failure', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            mockUpdate.mockRejectedValue(new Error('Network error'))

            const result = await store.reopenDay()

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
        })
    })

    describe('refreshDay', () => {
        it('refreshes day from API', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1, tickets: [] }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            const updatedDay = makeDay({
                id: 1,
                tickets: [makeTicket({ id: 10, total: '5.00' })],
            })
            mockShow.mockResolvedValue({
                data: { data: updatedDay },
                status: 200,
                headers: new Headers(),
            })

            await store.refreshDay()

            expect(store.currentDay?.tickets).toHaveLength(1)
            expect(mockShow).toHaveBeenCalledWith(1)
        })

        it('does nothing if no dayId', async () => {
            await store.refreshDay()
            expect(mockShow).not.toHaveBeenCalled()
        })
    })

    describe('fetchPreviousUnclosedDay', () => {
        it('sets previousUnclosedDay on 200', async () => {
            const previousDay = makeDay({ id: 2, closed_at: null })
            mockFetchPreviousUnclosed.mockResolvedValue({
                data: { data: previousDay },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchPreviousUnclosedDay()

            expect(store.previousUnclosedDay).toEqual(previousDay)
        })

        it('clears previousUnclosedDay on 404', async () => {
            mockFetchPreviousUnclosed.mockResolvedValue({
                data: { message: 'No previous unclosed day.' },
                status: 404,
                headers: new Headers(),
            })

            await store.fetchPreviousUnclosedDay()

            expect(store.previousUnclosedDay).toBeNull()
        })

        it('clears previousUnclosedDay on network error', async () => {
            mockFetchPreviousUnclosed.mockRejectedValue(
                new Error('Network error')
            )

            await store.fetchPreviousUnclosedDay()

            expect(store.previousUnclosedDay).toBeNull()
        })

        it('hasPreviousUnclosedDay is true when previousUnclosedDay set', async () => {
            mockFetchPreviousUnclosed.mockResolvedValue({
                data: { data: makeDay({ id: 2 }) },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchPreviousUnclosedDay()

            expect(store.hasPreviousUnclosedDay).toBe(true)
        })
    })

    describe('closeDay with targetDayId', () => {
        it('clears previousUnclosedDay when closing a previous unclosed day', async () => {
            const previousDay = makeDay({ id: 2 })
            store.previousUnclosedDay = previousDay

            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            const closedDay = makeDay({
                id: 2,
                closed_at: '2026-09-02T18:00:00Z',
            })
            mockUpdate.mockResolvedValue({
                data: { data: closedDay },
                status: 200,
                headers: new Headers(),
            })

            const result = await store.closeDay(2)

            expect(result.success).toBe(true)
            expect(store.previousUnclosedDay).toBeNull()
        })

        it('does not clear previousUnclosedDay when closing current day', async () => {
            const previousDay = makeDay({ id: 2 })
            store.previousUnclosedDay = previousDay

            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            mockUpdate.mockResolvedValue({
                data: {
                    data: makeDay({
                        id: 1,
                        closed_at: '2026-09-02T18:00:00Z',
                    }),
                },
                status: 200,
                headers: new Headers(),
            })

            await store.closeDay(1)

            expect(store.previousUnclosedDay).toEqual(previousDay)
        })
    })

    describe('closeDay non-200 path', () => {
        it('returns error on non-200 response', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: { data: makeDay({ id: 1 }) },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            mockUpdate.mockResolvedValue({
                data: { message: 'Bad request' },
                status: 400,
                headers: new Headers(),
            })

            const result = await store.closeDay()

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
        })
    })

    describe('reopenDay non-200 path', () => {
        it('returns error on non-200 response', async () => {
            mockFetchCurrent.mockResolvedValue({
                data: {
                    data: makeDay({ id: 1, closed_at: '2026-09-02T18:00:00Z' }),
                },
                status: 200,
                headers: new Headers(),
            })
            await store.fetchCurrentDay()

            mockUpdate.mockResolvedValue({
                data: { message: 'Bad request' },
                status: 400,
                headers: new Headers(),
            })

            const result = await store.reopenDay()

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
        })
    })

    describe('createDay with previous unclosed day', () => {
        it('returns error when 422 and previous unclosed day exists', async () => {
            const previousDay = makeDay({ id: 99 })
            mockFetchPreviousUnclosed.mockResolvedValue({
                data: { data: previousDay },
                status: 200,
                headers: new Headers(),
            })
            mockStore.mockResolvedValue({
                data: {
                    message: 'Validation failed',
                    errors: { season_id: ['The season id field is required.'] },
                },
                status: 422,
                headers: new Headers(),
            })

            const result = await store.createDay(42)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error).toBe(
                    "Une journée non cloturée existe déjà. Veuillez la cloturer avant d'en ouvrir une nouvelle."
                )
            }
        })
    })
})
