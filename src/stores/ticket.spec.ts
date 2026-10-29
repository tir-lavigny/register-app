import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProductResource, Voucher } from '@/api/model'

import { useStockLocationStore } from './stock-location'
import { useTicketStore } from './ticket'

const mockPreview = vi.fn()
const mockStore = vi.fn()

vi.mock('@/api/generated/ticket/ticket', () => ({
    registerTicketsPreview: (...args: unknown[]) => mockPreview(...args),
    registerTicketsStore: (...args: unknown[]) => mockStore(...args),
}))

function makeProduct(
    overrides: Partial<ProductResource> = {}
): ProductResource {
    return {
        id: 1,
        name: 'Cola',
        picture: null,
        unit_price: '3.50',
        allows_custom_price: false,
        is_stockable: true,
        category_id: 1,
        deleted_at: null,
        created_at: null,
        updated_at: null,
        ...overrides,
    }
}

function makeVoucher(overrides: Partial<Voucher> = {}): Voucher {
    return {
        id: 100,
        discount_percent: null,
        discount_fixed: '1.00',
        product_id: 1,
        season_id: 1,
        member_id: 1,
        deleted_at: null,
        created_at: null,
        updated_at: null,
        ...overrides,
    }
}

describe('ticket store', () => {
    let store: ReturnType<typeof useTicketStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        const locationStore = useStockLocationStore()
        locationStore.locations = [
            { id: 1, name: 'Main', description: null, active: true },
        ]
        locationStore.activeLocationId = 1
        localStorage.clear()
        store = useTicketStore()
    })

    describe('initial state', () => {
        it('has null draft', () => {
            expect(store.draft).toBeNull()
        })

        it('has null preview', () => {
            expect(store.preview).toBeNull()
        })

        it('has null previewError', () => {
            expect(store.previewError).toBeNull()
        })

        it('canFinalize is false', () => {
            expect(store.canFinalize).toBe(false)
        })
    })

    describe('startDraft', () => {
        it('creates empty draft', () => {
            store.startDraft()

            expect(store.draft).not.toBeNull()
            expect(store.draft!.items).toEqual([])
            expect(store.draft!.paymentMethod).toBeNull()
            expect(store.draft!.memberId).toBeNull()
            expect(store.draft!.memberName).toBeNull()
        })

        it('clears preview and previewError', () => {
            store.startDraft()
            store.preview = { total: 10, items: [] }
            store.previewError = 'error'
            store.startDraft()
            expect(store.preview).toBeNull()
            expect(store.previewError).toBeNull()
        })
    })

    describe('addItem', () => {
        beforeEach(() => {
            store.startDraft()
        })

        it('adds item to draft', () => {
            store.addItem(makeProduct(), 2)

            expect(store.draft!.items).toHaveLength(1)
            expect(store.draft!.items[0].productName).toBe('Cola')
            expect(store.draft!.items[0].quantity).toBe(2)
            expect(store.draft!.items[0].effectivePrice).toBe(3.5)
            expect(store.draft!.items[0].lineTotal).toBe(7)
        })

        it('merges same product', () => {
            store.addItem(makeProduct(), 2)
            store.addItem(makeProduct(), 3)

            expect(store.draft!.items).toHaveLength(1)
            expect(store.draft!.items[0].quantity).toBe(5)
        })

        it('handles custom price', () => {
            store.addItem(makeProduct(), 1, 5.0)

            expect(store.draft!.items[0].customUnitPrice).toBe(5.0)
            expect(store.draft!.items[0].effectivePrice).toBe(5.0)
            expect(store.draft!.items[0].lineTotal).toBe(5.0)
        })

        it('applies voucher discount to one unit only', () => {
            const voucher = makeVoucher({
                discount_fixed: '1.00',
                discount_percent: null,
            })
            store.addItem(makeProduct(), 2, null, [voucher])

            expect(store.draft!.items[0].voucherIds).toEqual([100])
            expect(store.draft!.items[0].appliedVouchers).toEqual([voucher])
            expect(store.draft!.items[0].lineTotal).toBe(6.0)
        })

        it('applies percent voucher discount to one unit only', () => {
            const voucher = makeVoucher({
                discount_percent: '20',
                discount_fixed: null,
            })
            store.addItem(makeProduct(), 2, null, [voucher])

            expect(store.draft!.items[0].lineTotal).toBe(6.3)
        })

        it('applies multiple vouchers up to quantity', () => {
            const product = makeProduct({ unit_price: '10.00' })
            const voucher1 = makeVoucher({
                id: 100,
                discount_percent: '100',
                discount_fixed: null,
            })
            const voucher2 = makeVoucher({
                id: 101,
                discount_percent: '100',
                discount_fixed: null,
            })

            store.addItem(product, 3, null, [voucher1, voucher2])

            expect(store.draft!.items[0].voucherIds).toEqual([100, 101])
            expect(store.draft!.items[0].lineTotal).toBe(10.0)
        })

        it('keeps existing vouchers when merging same product', () => {
            const voucher = makeVoucher({
                discount_percent: '100',
                discount_fixed: null,
            })
            store.addItem(makeProduct(), 1, null, [voucher])
            store.addItem(makeProduct(), 2)

            expect(store.draft!.items[0].quantity).toBe(3)
            expect(store.draft!.items[0].voucherIds).toEqual([100])
        })

        it('clamps voucher discount to minimum 0', () => {
            const voucher = makeVoucher({
                discount_fixed: '100.00',
                discount_percent: null,
            })
            store.addItem(makeProduct(), 1, null, [voucher])

            expect(store.draft!.items[0].lineTotal).toBe(0)
        })
    })

    describe('removeItem', () => {
        it('removes item at index', () => {
            store.startDraft()
            store.addItem(makeProduct({ id: 1, name: 'Cola' }), 1)
            store.addItem(makeProduct({ id: 2, name: 'Water' }), 1)

            store.removeItem(0)

            expect(store.draft!.items).toHaveLength(1)
            expect(store.draft!.items[0].productName).toBe('Water')
        })
    })

    describe('updateItemQuantity', () => {
        it('updates quantity and recalculates lineTotal', () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)

            store.updateItemQuantity(0, 5)

            expect(store.draft!.items[0].quantity).toBe(5)
            expect(store.draft!.items[0].lineTotal).toBe(17.5)
        })

        it('trims vouchers when quantity drops below applied count', () => {
            store.startDraft()
            const voucher1 = makeVoucher({
                id: 100,
                discount_percent: '100',
                discount_fixed: null,
            })
            const voucher2 = makeVoucher({
                id: 101,
                discount_percent: '100',
                discount_fixed: null,
            })
            store.addItem(makeProduct({ unit_price: '10.00' }), 3, null, [
                voucher1,
                voucher2,
            ])

            store.updateItemQuantity(0, 1)

            expect(store.draft!.items[0].quantity).toBe(1)
            expect(store.draft!.items[0].voucherIds).toEqual([100])
            expect(store.draft!.items[0].appliedVouchers).toEqual([voucher1])
            expect(store.draft!.items[0].lineTotal).toBe(0)
        })
    })

    describe('setPaymentMethod', () => {
        it('sets payment method', () => {
            store.startDraft()
            store.setPaymentMethod('cash')
            expect(store.draft!.paymentMethod).toBe('cash')
        })
    })

    describe('setMember', () => {
        it('sets member id and name', () => {
            store.startDraft()
            store.setMember(42, 'John Doe')
            expect(store.draft!.memberId).toBe(42)
            expect(store.draft!.memberName).toBe('John Doe')
        })

        it('clears member', () => {
            store.startDraft()
            store.setMember(42, 'John Doe')
            store.setMember(null, null)
            expect(store.draft!.memberId).toBeNull()
            expect(store.draft!.memberName).toBeNull()
        })
    })

    describe('clearVouchersForItem', () => {
        it('clears vouchers from item', () => {
            store.startDraft()
            const voucher = makeVoucher()
            store.addItem(makeProduct(), 2, null, [voucher])

            expect(store.draft!.items[0].voucherIds).toEqual([100])

            store.clearVouchersForItem(0)

            expect(store.draft!.items[0].voucherIds).toEqual([])
            expect(store.draft!.items[0].appliedVouchers).toEqual([])
            expect(store.draft!.items[0].lineTotal).toBe(7.0)
        })
    })

    describe('canFinalize', () => {
        it('false when no draft', () => {
            expect(store.canFinalize).toBe(false)
        })

        it('false when empty items', () => {
            store.startDraft()
            expect(store.canFinalize).toBe(false)
        })

        it('false when no payment method', () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)
            expect(store.canFinalize).toBe(false)
        })

        it('true when items and payment method set', () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)
            store.setPaymentMethod('cash')
            expect(store.canFinalize).toBe(true)
        })
    })

    describe('fetchPreview', () => {
        beforeEach(() => {
            store.startDraft()
            store.addItem(makeProduct(), 2)
        })

        it('calls preview endpoint with draft data', async () => {
            mockPreview.mockResolvedValue({
                data: { total: 7.0, items: [] },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchPreview(1)

            expect(mockPreview).toHaveBeenCalled()
            expect(store.preview).toEqual({ total: 7.0, items: [] })
        })

        it('sends voucher_ids array in payload', async () => {
            mockPreview.mockResolvedValue({
                data: { total: 7.0, items: [] },
                status: 200,
                headers: new Headers(),
            })

            await store.fetchPreview(1)

            const payload = mockPreview.mock.calls[0][0] as {
                items: { voucher_ids: number[] }[]
            }
            expect(payload.items[0].voucher_ids).toEqual([])
        })

        it('sets previewLoading during fetch', async () => {
            mockPreview.mockResolvedValue({
                data: { total: 7.0, items: [] },
                status: 200,
                headers: new Headers(),
            })

            const loadingValues: boolean[] = []
            const unwatch = store.$subscribe(() => {
                loadingValues.push(store.previewLoading)
            })

            await store.fetchPreview(1)
            unwatch()

            expect(loadingValues).toContain(true)
            expect(loadingValues[loadingValues.length - 1]).toBe(false)
        })

        it('sets previewError on non-200 response', async () => {
            mockPreview.mockResolvedValue({
                data: { message: 'The voucher has already been used.' },
                status: 422,
                headers: new Headers(),
            })

            await store.fetchPreview(1)

            expect(store.previewError).toBe(
                'The voucher has already been used.'
            )
        })

        it('sets previewError on network failure', async () => {
            mockPreview.mockRejectedValue(new Error('Network error'))

            await store.fetchPreview(1)

            expect(store.previewError).toBe('Impossible de calculer le total.')
        })

        it('clears previewError on success', async () => {
            mockPreview.mockResolvedValue({
                data: { total: 7.0, items: [] },
                status: 200,
                headers: new Headers(),
            })
            store.previewError = 'previous error'

            await store.fetchPreview(1)

            expect(store.previewError).toBeNull()
        })

        it('does not call preview when no items', async () => {
            store.startDraft()
            await store.fetchPreview(1)

            expect(mockPreview).not.toHaveBeenCalled()
        })
    })

    describe('applyVouchers', () => {
        beforeEach(() => {
            store.startDraft()
        })

        it('applies percent discount voucher to one unit', () => {
            store.addItem(makeProduct(), 2)
            const voucher = makeVoucher({
                discount_percent: '20',
                discount_fixed: null,
            })

            store.applyVouchers(0, [voucher])

            expect(store.draft!.items[0].voucherIds).toEqual([100])
            expect(store.draft!.items[0].appliedVouchers).toEqual([voucher])
            expect(store.draft!.items[0].lineTotal).toBe(6.3)
        })

        it('applies fixed discount voucher to one unit', () => {
            store.addItem(makeProduct(), 2)
            const voucher = makeVoucher({
                discount_fixed: '1.00',
                discount_percent: null,
            })

            store.applyVouchers(0, [voucher])

            expect(store.draft!.items[0].lineTotal).toBe(6.0)
        })

        it('applies multiple vouchers to multiple units', () => {
            store.addItem(makeProduct({ unit_price: '10.00' }), 3)
            const voucher1 = makeVoucher({
                id: 100,
                discount_percent: '100',
                discount_fixed: null,
            })
            const voucher2 = makeVoucher({
                id: 101,
                discount_percent: '100',
                discount_fixed: null,
            })

            store.applyVouchers(0, [voucher1, voucher2])

            expect(store.draft!.items[0].voucherIds).toEqual([100, 101])
            expect(store.draft!.items[0].lineTotal).toBe(10.0)
        })

        it('clamps discount to 0 when exceeds subtotal', () => {
            store.addItem(makeProduct(), 1)
            const voucher = makeVoucher({
                discount_fixed: '100.00',
                discount_percent: null,
            })

            store.applyVouchers(0, [voucher])

            expect(store.draft!.items[0].lineTotal).toBe(0)
        })

        it('trims vouchers to quantity', () => {
            store.addItem(makeProduct({ unit_price: '10.00' }), 1)
            const voucher1 = makeVoucher({
                id: 100,
                discount_percent: '100',
                discount_fixed: null,
            })
            const voucher2 = makeVoucher({
                id: 101,
                discount_percent: '100',
                discount_fixed: null,
            })

            store.applyVouchers(0, [voucher1, voucher2])

            expect(store.draft!.items[0].voucherIds).toEqual([100])
            expect(store.draft!.items[0].lineTotal).toBe(0)
        })

        it('clears vouchers when empty array applied', () => {
            store.addItem(makeProduct(), 1, null, [makeVoucher()])

            store.applyVouchers(0, [])

            expect(store.draft!.items[0].voucherIds).toEqual([])
            expect(store.draft!.items[0].lineTotal).toBe(3.5)
        })

        it('does nothing when no draft', () => {
            const freshPinia = createPinia()
            setActivePinia(freshPinia)
            const freshStore = useTicketStore()

            freshStore.applyVouchers(0, [makeVoucher()])

            expect(freshStore.draft).toBeNull()
        })

        it('does nothing when index is out of range', () => {
            store.addItem(makeProduct(), 1)

            store.applyVouchers(99, [makeVoucher()])

            expect(store.draft!.items[0].voucherIds).toEqual([])
        })
    })

    describe('storage methods', () => {
        beforeEach(() => {
            localStorage.clear()
        })

        it('saveDraftToStorage saves draft to localStorage', () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)

            store.saveDraftToStorage(1)

            const raw = localStorage.getItem('register_draft_1')
            expect(raw).not.toBeNull()
            const parsed = JSON.parse(raw!)
            expect(parsed.items).toHaveLength(1)
        })

        it('loadDraftFromStorage returns parsed draft', () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)

            store.saveDraftToStorage(1)

            const loaded = store.loadDraftFromStorage(1)

            expect(loaded).not.toBeNull()
            expect(loaded!.items).toHaveLength(1)
        })

        it('loadDraftFromStorage normalizes legacy voucher fields', () => {
            localStorage.setItem(
                'register_draft_1',
                JSON.stringify({
                    items: [
                        {
                            productId: 1,
                            productName: 'Cola',
                            quantity: 2,
                            unitPrice: 3.5,
                            customUnitPrice: null,
                            effectivePrice: 3.5,
                            voucherId: 100,
                            voucherDiscount: 0.7,
                            lineTotal: 6.3,
                        },
                    ],
                    paymentMethod: 'cash',
                    memberId: null,
                    memberName: null,
                })
            )

            const loaded = store.loadDraftFromStorage(1)

            expect(loaded).not.toBeNull()
            expect(loaded!.items[0].voucherIds).toEqual([])
            expect(loaded!.items[0].appliedVouchers).toEqual([])
            expect(loaded!.items[0].lineTotal).toBe(7.0)
        })

        it('loadDraftFromStorage returns null when storage is empty', () => {
            expect(store.loadDraftFromStorage(1)).toBeNull()
        })

        it('loadDraftFromStorage returns null for invalid JSON', () => {
            localStorage.setItem('register_draft_1', 'not-json')

            expect(store.loadDraftFromStorage(1)).toBeNull()
        })

        it('clearDraftStorage removes draft from localStorage', () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)

            store.saveDraftToStorage(1)

            store.clearDraftStorage(1)

            expect(localStorage.getItem('register_draft_1')).toBeNull()
        })

        it('hasDraftInStorage returns true when draft exists', () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)

            store.saveDraftToStorage(1)

            expect(store.hasDraftInStorage(1)).toBe(true)
        })

        it('hasDraftInStorage returns false when no draft', () => {
            expect(store.hasDraftInStorage(1)).toBe(false)
        })
    })

    describe('dayId storage integration', () => {
        beforeEach(() => {
            localStorage.clear()
        })

        it('startDraft with dayId saves to storage', () => {
            store.startDraft(1)

            expect(localStorage.getItem('register_draft_1')).not.toBeNull()
        })

        it('addItem with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 2, null, [], 1)

            const raw = localStorage.getItem('register_draft_1')
            expect(raw).not.toBeNull()
            const parsed = JSON.parse(raw!)
            expect(parsed.items).toHaveLength(1)
        })

        it('removeItem with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, [], 1)
            store.removeItem(0, 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.items).toHaveLength(0)
        })

        it('updateItemQuantity with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, [], 1)
            store.updateItemQuantity(0, 5, 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.items[0].quantity).toBe(5)
        })

        it('setPaymentMethod with dayId saves to storage', () => {
            store.startDraft(1)
            store.setPaymentMethod('cash', 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.paymentMethod).toBe('cash')
        })

        it('setMember with dayId saves to storage', () => {
            store.startDraft(1)
            store.setMember(42, 'John', 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.memberId).toBe(42)
        })

        it('applyVouchers with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, [], 1)
            store.applyVouchers(0, [makeVoucher()], 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.items[0].voucherIds).toEqual([100])
        })

        it('clearVouchersForItem with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, [makeVoucher()], 1)
            store.clearVouchersForItem(0, 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.items[0].voucherIds).toEqual([])
        })

        it('finalizeTicket clears storage', async () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, [], 1)
            store.setPaymentMethod('cash', 1)

            mockStore.mockResolvedValue({
                data: { data: { id: 1, total: '3.50' } },
                status: 201,
                headers: new Headers(),
            })

            await store.finalizeTicket(1)

            expect(localStorage.getItem('register_draft_1')).toBeNull()
        })
    })
})
