import { HttpResponse, http } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { getRegisterTicketsPreviewMockHandler } from '@/api/generated/ticket/ticket.msw'
import { getRegisterTicketsStoreMockHandler } from '@/api/generated/ticket/ticket.msw'
import type { Product } from '@/api/model'
import { useTicketStore } from '@/stores/ticket'

import { server } from '../setup'

function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
        id: 1,
        name: 'Cola',
        picture: null,
        unit_price: '3.50',
        allows_custom_price: false,
        category_id: 1,
        deleted_at: null,
        created_at: null,
        updated_at: null,
        ...overrides,
    }
}

describe('ticket flow integration', () => {
    let store: ReturnType<typeof useTicketStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useTicketStore()
        localStorage.clear()
    })

    describe('fetchPreview', () => {
        it('calls preview endpoint with draft data', async () => {
            store.startDraft()
            store.addItem(makeProduct(), 2)

            let capturedPayload: unknown = null
            server.use(
                http.post('*/register/tickets/preview', async ({ request }) => {
                    capturedPayload = await request.json()
                    return HttpResponse.json(
                        { total: 7.0, items: [] },
                        { status: 200 }
                    )
                })
            )

            await store.fetchPreview(1)

            expect(capturedPayload).toBeDefined()
            expect(
                (capturedPayload as Record<string, unknown>).operating_day_id
            ).toBe(1)
            expect(store.preview).toEqual({ total: 7.0, items: [] })
        })

        it('does not call preview when no items', async () => {
            let called = false
            server.use(
                http.post('*/register/tickets/preview', async () => {
                    called = true
                    return HttpResponse.json(
                        { total: 0, items: [] },
                        { status: 200 }
                    )
                })
            )

            store.startDraft()
            await store.fetchPreview(1)

            expect(called).toBe(false)
            expect(store.preview).toBeNull()
        })

        it('sets previewLoading during fetch', async () => {
            server.use(getRegisterTicketsPreviewMockHandler())

            store.startDraft()
            store.addItem(makeProduct(), 1)

            const loadingValues: boolean[] = []
            const unwatch = store.$subscribe(() => {
                loadingValues.push(store.previewLoading)
            })

            await store.fetchPreview(1)
            unwatch()

            expect(loadingValues).toContain(true)
            expect(loadingValues[loadingValues.length - 1]).toBe(false)
        })
    })

    describe('finalizeTicket', () => {
        it('finalizes on 201 and clears draft', async () => {
            store.startDraft()
            store.addItem(makeProduct(), 2)
            store.setPaymentMethod('cash')

            let capturedPayload: unknown = null
            server.use(
                http.post('*/register/tickets', async ({ request }) => {
                    capturedPayload = await request.json()
                    return HttpResponse.json(
                        { data: { id: 1, total: '7.00' } },
                        { status: 201 }
                    )
                })
            )

            const result = await store.finalizeTicket(1)

            expect(result).toEqual({ success: true })
            expect(store.draft).toBeNull()
            expect(store.preview).toBeNull()

            const payload = capturedPayload as Record<string, unknown>
            expect(payload.payment_method).toBe('cash')
            expect(payload.operating_day_id).toBe(1)
            expect(payload.items).toHaveLength(1)
        })

        it('returns validation errors on 422', async () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)
            store.setPaymentMethod('cash')

            server.use(
                http.post('*/register/tickets', () =>
                    HttpResponse.json(
                        {
                            message: 'Validation failed',
                            errors: { items: ['The items field is required.'] },
                        },
                        { status: 422 }
                    )
                )
            )

            const result = await store.finalizeTicket(1)

            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error).toBe('Validation failed')
                expect(result.errors).toEqual({
                    items: ['The items field is required.'],
                })
            }
        })

        it('returns error when draft is empty', async () => {
            store.startDraft()
            const result = await store.finalizeTicket(1)

            expect(result).toEqual({
                success: false,
                error: 'Le ticket est vide.',
            })
        })

        it('returns error on network failure', async () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)
            store.setPaymentMethod('cash')

            server.use(
                http.post('*/register/tickets', () => HttpResponse.error())
            )

            const result = await store.finalizeTicket(1)

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
            expect(store.draft).not.toBeNull()
        })
    })

    describe('full ticket creation flow', () => {
        it('draft -> add items -> preview -> finalize', async () => {
            server.use(
                getRegisterTicketsPreviewMockHandler({
                    total: 7.0,
                    items: [
                        {
                            product_id: 1,
                            voucher_id: 0,
                            quantity: '2',
                            unit_price: '3.50',
                            subtotal: '7.00',
                        },
                    ],
                }),
                getRegisterTicketsStoreMockHandler({
                    data: {
                        id: 42,
                        total: '7.00',
                        payment_method: 'cash',
                        operating_day_id: 1,
                        deleted_at: null,
                        created_at: null,
                        updated_at: null,
                        member_id: null,
                        sold_at: '2026-09-02T10:00:00Z',
                    },
                })
            )

            store.startDraft()
            store.addItem(makeProduct(), 2)
            expect(store.draft!.items).toHaveLength(1)

            await store.fetchPreview(1)
            expect(store.preview).not.toBeNull()
            expect(store.preview!.total).toBe(7.0)

            store.setPaymentMethod('cash')
            expect(store.canFinalize).toBe(true)

            const result = await store.finalizeTicket(1)
            expect(result).toEqual({ success: true })
            expect(store.draft).toBeNull()
            expect(store.preview).toBeNull()
        })

        it('draft -> add items -> finalize clears storage', async () => {
            server.use(getRegisterTicketsStoreMockHandler())

            store.startDraft(1)
            store.addItem(makeProduct(), 2, null, null, 1)
            store.setPaymentMethod('cash', 1)

            expect(store.hasDraftInStorage(1)).toBe(true)

            await store.finalizeTicket(1)

            expect(store.hasDraftInStorage(1)).toBe(false)
        })

        it('draft with member and multiple items', async () => {
            server.use(getRegisterTicketsStoreMockHandler())

            store.startDraft()
            store.addItem(
                makeProduct({ id: 1, name: 'Cola', unit_price: '3.50' }),
                2
            )
            store.addItem(
                makeProduct({ id: 2, name: 'Water', unit_price: '2.00' }),
                1
            )
            store.setMember(5, 'Alice')
            store.setPaymentMethod('twint')

            const result = await store.finalizeTicket(1)

            expect(result).toEqual({ success: true })
            expect(store.draft).toBeNull()
        })
    })
})
