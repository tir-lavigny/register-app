import { HttpResponse, http } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { getRegisterOperatingDaysCurrentMockHandler } from '@/api/generated/operating-day/operating-day.msw'
import { useOperatingDayStore } from '@/stores/operating-day'

import { server } from '../setup'

function makeDay(
    overrides: {
        id: number
        closed_at?: string | null
        tickets?: unknown[]
    } & Record<string, unknown>
) {
    return {
        date: '2026-09-02',
        started_at: '2026-09-02T08:00:00Z',
        closed_at: null,
        season_id: 1,
        cash_remark: null,
        closing_balance: 0,
        total_cash: '0.00',
        total_twint: '0.00',
        created_at: null,
        updated_at: null,
        tickets: [],
        ...overrides,
    }
}

describe('operating day flow integration', () => {
    let store: ReturnType<typeof useOperatingDayStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useOperatingDayStore()
    })

    describe('fetchCurrentDay', () => {
        it('sets currentDay on 200', async () => {
            const day = makeDay({ id: 1 })
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: day as never,
                })
            )

            await store.fetchCurrentDay()

            expect(store.currentDay).toEqual(day)
            expect(store.isOpen).toBe(true)
            expect(store.dayId).toBe(1)
        })

        it('sets currentDay to null on 404', async () => {
            server.use(
                http.get('*/register/days/current', () =>
                    HttpResponse.json(
                        { message: 'No open operating day for today.' },
                        { status: 404 }
                    )
                )
            )

            await store.fetchCurrentDay()

            expect(store.currentDay).toBeNull()
            expect(store.isOpen).toBe(false)
        })

        it('sets loading during fetch', async () => {
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: makeDay({ id: 1 }) as never,
                })
            )

            const loadingValues: boolean[] = []
            const unwatch = store.$subscribe(() => {
                loadingValues.push(store.loading)
            })

            await store.fetchCurrentDay()
            unwatch()

            expect(loadingValues).toContain(true)
            expect(loadingValues[loadingValues.length - 1]).toBe(false)
        })

        it('computes activeTickets from fetched day', async () => {
            const day = makeDay({
                id: 1,
                tickets: [
                    {
                        id: 10,
                        total: '25.00',
                        payment_method: 'cash',
                        operating_day_id: 1,
                        member_id: null,
                        sold_at: '2026-09-02T10:00:00Z',
                        deleted_at: null,
                        created_at: null,
                        updated_at: null,
                    },
                    {
                        id: 11,
                        total: '10.00',
                        payment_method: 'twint',
                        operating_day_id: 1,
                        member_id: null,
                        sold_at: '2026-09-02T11:00:00Z',
                        deleted_at: '2026-09-02T12:00:00Z',
                        created_at: null,
                        updated_at: null,
                    },
                ],
            })
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: day as never,
                })
            )

            await store.fetchCurrentDay()

            expect(store.activeTickets).toHaveLength(1)
            expect(store.canceledTickets).toHaveLength(1)
            expect(store.cashTotal).toBe(25)
        })
    })

    describe('fetchPreviousUnclosedDay', () => {
        it('sets previousUnclosedDay on 200', async () => {
            const previousDay = makeDay({ id: 2 })
            server.use(
                http.get('*/register/days/previous-unclosed', () =>
                    HttpResponse.json({ data: previousDay }, { status: 200 })
                )
            )

            await store.fetchPreviousUnclosedDay()

            expect(store.previousUnclosedDay).toEqual(previousDay)
            expect(store.hasPreviousUnclosedDay).toBe(true)
        })

        it('clears previousUnclosedDay on 404', async () => {
            server.use(
                http.get('*/register/days/previous-unclosed', () =>
                    HttpResponse.json(
                        { message: 'No previous unclosed day.' },
                        { status: 404 }
                    )
                )
            )

            await store.fetchPreviousUnclosedDay()

            expect(store.previousUnclosedDay).toBeNull()
            expect(store.hasPreviousUnclosedDay).toBe(false)
        })
    })

    describe('createDay', () => {
        it('creates day on 201', async () => {
            const newDay = makeDay({ id: 5, season_id: 42 })
            server.use(
                http.post('*/register/days', () =>
                    HttpResponse.json({ data: newDay }, { status: 201 })
                )
            )

            const result = await store.createDay(42)

            expect(result).toEqual({ success: true })
            expect(store.currentDay).toEqual(newDay)
            expect(store.isOpen).toBe(true)
        })

        it('returns error if day already open', async () => {
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: makeDay({ id: 1 }) as never,
                })
            )
            await store.fetchCurrentDay()

            const result = await store.createDay(1)

            expect(result).toEqual({
                success: false,
                error: 'Une journée est déjà ouverte.',
            })
        })

        it('returns validation errors on 422', async () => {
            server.use(
                http.post('*/register/days', () =>
                    HttpResponse.json(
                        {
                            message: 'Validation failed',
                            errors: {
                                season_id: ['The season id field is required.'],
                            },
                        },
                        { status: 422 }
                    )
                ),
                http.get('*/register/days/previous-unclosed', () =>
                    HttpResponse.json(
                        { message: 'No previous unclosed day.' },
                        { status: 404 }
                    )
                )
            )

            const result = await store.createDay(42)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error).toBe('Validation failed')
                expect(result.errors).toEqual({
                    season_id: ['The season id field is required.'],
                })
            }
        })

        it('returns unclosed day error on 422 when previous exists', async () => {
            const previousDay = makeDay({ id: 99 })
            server.use(
                http.post('*/register/days', () =>
                    HttpResponse.json(
                        {
                            message: 'Validation failed',
                            errors: { season_id: ['already exists'] },
                        },
                        { status: 422 }
                    )
                ),
                http.get('*/register/days/previous-unclosed', () =>
                    HttpResponse.json({ data: previousDay }, { status: 200 })
                )
            )

            const result = await store.createDay(42)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error).toBe(
                    "Une journée non cloturée existe déjà. Veuillez la cloturer avant d'en ouvrir une nouvelle."
                )
            }
        })

        it('returns error on network failure', async () => {
            server.use(http.post('*/register/days', () => HttpResponse.error()))

            const result = await store.createDay(42)

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
        })
    })

    describe('closeDay', () => {
        it('closes day on 200', async () => {
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: makeDay({ id: 1 }) as never,
                })
            )
            await store.fetchCurrentDay()

            const closedDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
                total_cash: '245.00',
                total_twint: '87.50',
            })
            server.use(
                http.patch('*/register/days/:operatingDay', () =>
                    HttpResponse.json({ data: closedDay }, { status: 200 })
                )
            )
            // After close, fetchCurrentDay returns the closed day
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: closedDay as never,
                })
            )

            const result = await store.closeDay(undefined, 'Extra CHF 5')

            expect(result.success).toBe(true)
            expect(store.currentDay).toEqual(closedDay)
            expect(store.isOpen).toBe(false)
        })

        it('sends cash_remark to API', async () => {
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: makeDay({ id: 1 }) as never,
                })
            )
            await store.fetchCurrentDay()

            let capturedBody: unknown = null
            server.use(
                http.patch(
                    '*/register/days/:operatingDay',
                    async ({ request }) => {
                        capturedBody = await request.json()
                        return HttpResponse.json(
                            {
                                data: makeDay({
                                    id: 1,
                                    closed_at: '2026-09-02T18:00:00Z',
                                }),
                            },
                            { status: 200 }
                        )
                    }
                )
            )

            await store.closeDay(undefined, 'Missing CHF 2')

            expect(capturedBody).toEqual({
                status: 'closed',
                cash_remark: 'Missing CHF 2',
            })
        })

        it('returns error if no day open', async () => {
            const result = await store.closeDay()

            expect(result).toEqual({
                success: false,
                error: 'Aucune journée à fermer.',
            })
        })

        it('returns error on network failure', async () => {
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: makeDay({ id: 1 }) as never,
                })
            )
            await store.fetchCurrentDay()

            server.use(
                http.patch('*/register/days/:operatingDay', () =>
                    HttpResponse.error()
                )
            )

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
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: makeDay({
                        id: 1,
                        closed_at: '2026-09-02T18:00:00Z',
                    }) as never,
                })
            )
            await store.fetchCurrentDay()
            store.currentDay = {
                ...store.currentDay!,
                closed_at: '2026-09-02T18:00:00Z',
            }

            const reopenedDay = makeDay({ id: 1, closed_at: null })
            server.use(
                http.patch('*/register/days/:operatingDay', () =>
                    HttpResponse.json({ data: reopenedDay }, { status: 200 })
                )
            )
            // After reopen, fetchCurrentDay returns the reopened day
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: reopenedDay as never,
                })
            )

            const result = await store.reopenDay()

            expect(result).toEqual({ success: true })
            expect(store.isOpen).toBe(true)
        })

        it('sends open status to API', async () => {
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: makeDay({ id: 1 }) as never,
                })
            )
            await store.fetchCurrentDay()

            let capturedBody: unknown = null
            server.use(
                http.patch(
                    '*/register/days/:operatingDay',
                    async ({ request }) => {
                        capturedBody = await request.json()
                        return HttpResponse.json(
                            { data: makeDay({ id: 1 }) },
                            { status: 200 }
                        )
                    }
                )
            )

            await store.reopenDay()

            expect(capturedBody).toEqual({ status: 'open' })
        })

        it('returns error if no dayId', async () => {
            const result = await store.reopenDay()

            expect(result).toEqual({
                success: false,
                error: 'Aucune journée refermée.',
            })
        })
    })

    describe('refreshDay', () => {
        it('refreshes day from API', async () => {
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: makeDay({ id: 1, tickets: [] }) as never,
                })
            )
            await store.fetchCurrentDay()

            const updatedDay = makeDay({
                id: 1,
                tickets: [
                    {
                        id: 10,
                        total: '5.00',
                        payment_method: 'cash',
                        operating_day_id: 1,
                        member_id: null,
                        sold_at: '2026-09-02T10:00:00Z',
                        deleted_at: null,
                        created_at: null,
                        updated_at: null,
                    },
                ],
            })
            server.use(
                http.get('*/register/days/:operatingDay', () =>
                    HttpResponse.json({ data: updatedDay }, { status: 200 })
                )
            )

            await store.refreshDay()

            expect(store.currentDay?.tickets).toHaveLength(1)
        })

        it('does nothing if no dayId', async () => {
            let called = false
            server.use(
                http.get('*/register/days/:operatingDay', () => {
                    called = true
                    return HttpResponse.json(
                        { data: makeDay({ id: 1 }) },
                        { status: 200 }
                    )
                })
            )

            await store.refreshDay()

            expect(called).toBe(false)
        })
    })

    describe('full lifecycle', () => {
        it('create -> close -> reopen -> refresh', async () => {
            server.use(
                http.post('*/register/days', () =>
                    HttpResponse.json(
                        { data: makeDay({ id: 10, season_id: 5 }) },
                        { status: 201 }
                    )
                )
            )

            const createResult = await store.createDay(5)
            expect(createResult).toEqual({ success: true })
            expect(store.isOpen).toBe(true)

            const closedDay = makeDay({
                id: 10,
                closed_at: '2026-09-02T18:00:00Z',
            })
            server.use(
                http.patch('*/register/days/:operatingDay', () =>
                    HttpResponse.json({ data: closedDay }, { status: 200 })
                )
            )
            // After close, fetchCurrentDay returns the closed day
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: closedDay as never,
                })
            )

            const closeResult = await store.closeDay()
            expect(closeResult.success).toBe(true)
            expect(store.currentDay).toEqual(closedDay)

            const reopenedDay = makeDay({ id: 10, closed_at: null })
            server.use(
                http.patch('*/register/days/:operatingDay', () =>
                    HttpResponse.json({ data: reopenedDay }, { status: 200 })
                )
            )
            // After reopen, fetchCurrentDay returns the reopened day
            server.use(
                getRegisterOperatingDaysCurrentMockHandler({
                    data: reopenedDay as never,
                })
            )

            const reopenResult = await store.reopenDay()
            expect(reopenResult).toEqual({ success: true })
            expect(store.isOpen).toBe(true)

            server.use(
                http.get('*/register/days/:operatingDay', () =>
                    HttpResponse.json(
                        {
                            data: makeDay({
                                id: 10,
                                tickets: [
                                    {
                                        id: 1,
                                        total: '3.50',
                                        payment_method: 'cash',
                                        operating_day_id: 10,
                                        member_id: null,
                                        sold_at: '2026-09-02T10:00:00Z',
                                        deleted_at: null,
                                        created_at: null,
                                        updated_at: null,
                                    },
                                ],
                            }),
                        },
                        { status: 200 }
                    )
                )
            )

            await store.refreshDay()
            expect(store.activeTickets).toHaveLength(1)
            expect(store.cashTotal).toBe(3.5)
        })
    })
})
