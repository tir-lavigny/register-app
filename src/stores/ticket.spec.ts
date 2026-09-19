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
        store = useTicketStore()
    })

    describe('initial state', () => {
        it('has null draft', () => {
            expect(store.draft).toBeNull()
        })

        it('has null preview', () => {
            expect(store.preview).toBeNull()
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

        it('clears preview', () => {
            store.startDraft()
            store.preview = { total: 10, items: [] }
            store.startDraft()
            expect(store.preview).toBeNull()
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

        it('applies voucher with fixed discount', () => {
            const voucher = makeVoucher({
                discount_fixed: '1.00',
                discount_percent: null,
            })
            store.addItem(makeProduct(), 2, null, voucher)

            expect(store.draft!.items[0].voucherId).toBe(100)
            expect(store.draft!.items[0].voucherDiscount).toBe(1.0)
            expect(store.draft!.items[0].lineTotal).toBe(6.0)
        })

        it('applies voucher with percent discount', () => {
            const voucher = makeVoucher({
                discount_percent: '20',
                discount_fixed: null,
            })
            store.addItem(makeProduct(), 2, null, voucher)

            expect(store.draft!.items[0].voucherDiscount).toBe(1.4)
            expect(store.draft!.items[0].lineTotal).toBe(5.6)
        })

        it('ignores voucher for wrong product', () => {
            const voucher = makeVoucher({ product_id: 999 })
            store.addItem(makeProduct(), 1, null, voucher)

            expect(store.draft!.items[0].voucherId).toBeNull()
            expect(store.draft!.items[0].voucherDiscount).toBeNull()
        })

        it('clamps voucher discount to minimum 0', () => {
            const voucher = makeVoucher({
                discount_fixed: '100.00',
                discount_percent: null,
            })
            store.addItem(makeProduct(), 1, null, voucher)

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
        })
    })

    describe('clearVoucherForItem', () => {
        it('clears voucher from item', () => {
            store.startDraft()
            const voucher = makeVoucher()
            store.addItem(makeProduct(), 2, null, voucher)

            expect(store.draft!.items[0].voucherId).toBe(100)

            store.clearVoucherForItem(0)

            expect(store.draft!.items[0].voucherId).toBeNull()
            expect(store.draft!.items[0].voucherDiscount).toBeNull()
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

        it('does not call preview when no items', async () => {
            store.startDraft()
            await store.fetchPreview(1)
            expect(mockPreview).not.toHaveBeenCalled()
        })
    })

    describe('finalizeTicket', () => {
        beforeEach(() => {
            store.startDraft()
            store.addItem(makeProduct(), 2)
            store.setPaymentMethod('cash')
        })

        it('finalizes on 201', async () => {
            mockStore.mockResolvedValue({
                data: { data: { id: 1, total: '7.00' } },
                status: 201,
                headers: new Headers(),
            })

            const result = await store.finalizeTicket(1)

            expect(result).toEqual({ success: true, items: expect.any(Array) })
            expect(store.draft).toBeNull()
            expect(store.preview).toBeNull()
        })

        it('returns validation errors on 422', async () => {
            mockStore.mockResolvedValue({
                data: {
                    message: 'Validation failed',
                    errors: { items: ['The items field is required.'] },
                },
                status: 422,
                headers: new Headers(),
            })

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

        it('returns error when no payment method', async () => {
            store.startDraft()
            store.addItem(makeProduct(), 1)
            const result = await store.finalizeTicket(1)

            expect(result).toEqual({
                success: false,
                error: 'Le ticket est vide.',
            })
        })

        it('returns error on network failure', async () => {
            mockStore.mockRejectedValue(new Error('Network error'))

            const result = await store.finalizeTicket(1)

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
            expect(store.draft).not.toBeNull()
        })

        it('returns generic error on unexpected status', async () => {
            mockStore.mockResolvedValue({
                data: { message: 'Server error' },
                status: 500,
                headers: new Headers(),
            })

            const result = await store.finalizeTicket(1)

            expect(result).toEqual({
                success: false,
                error: 'Une erreur inattendue est survenue.',
            })
        })
    })

    describe('applyVoucher', () => {
        beforeEach(() => {
            store.startDraft()
        })

        it('applies percent discount voucher', () => {
            store.addItem(makeProduct(), 2)
            const voucher = makeVoucher({
                discount_percent: '20',
                discount_fixed: null,
            })

            store.applyVoucher(0, voucher)

            expect(store.draft!.items[0].voucherId).toBe(100)
            expect(store.draft!.items[0].voucherDiscount).toBe(1.4)
            expect(store.draft!.items[0].lineTotal).toBe(5.6)
        })

        it('applies fixed discount voucher', () => {
            store.addItem(makeProduct(), 2)
            const voucher = makeVoucher({
                discount_fixed: '1.00',
                discount_percent: null,
            })

            store.applyVoucher(0, voucher)

            expect(store.draft!.items[0].voucherId).toBe(100)
            expect(store.draft!.items[0].voucherDiscount).toBe(1.0)
            expect(store.draft!.items[0].lineTotal).toBe(6.0)
        })

        it('clamps discount to 0 when exceeds subtotal', () => {
            store.addItem(makeProduct(), 1)
            const voucher = makeVoucher({
                discount_fixed: '100.00',
                discount_percent: null,
            })

            store.applyVoucher(0, voucher)

            expect(store.draft!.items[0].lineTotal).toBe(0)
        })

        it('does nothing when no draft', () => {
            const freshPinia = createPinia()
            setActivePinia(freshPinia)
            const freshStore = useTicketStore()
            const voucher = makeVoucher()
            freshStore.applyVoucher(0, voucher)
            expect(freshStore.draft).toBeNull()
        })

        it('does nothing when index is out of range', () => {
            store.addItem(makeProduct(), 1)
            const voucher = makeVoucher()
            store.applyVoucher(99, voucher)
            expect(store.draft!.items[0].voucherId).toBeNull()
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

        it('loadDraftFromStorage returns null for missing key', () => {
            const loaded = store.loadDraftFromStorage(999)

            expect(loaded).toBeNull()
        })

        it('loadDraftFromStorage returns null for invalid JSON', () => {
            localStorage.setItem('register_draft_1', 'not-json')

            const loaded = store.loadDraftFromStorage(1)

            expect(loaded).toBeNull()
        })

        it('clearDraftStorage removes draft from localStorage', () => {
            store.startDraft()
            store.saveDraftToStorage(1)

            store.clearDraftStorage(1)

            expect(localStorage.getItem('register_draft_1')).toBeNull()
        })

        it('hasDraftInStorage returns true when draft exists', () => {
            store.startDraft()
            store.saveDraftToStorage(1)

            expect(store.hasDraftInStorage(1)).toBe(true)
        })

        it('hasDraftInStorage returns false when no draft', () => {
            localStorage.clear()
            expect(store.hasDraftInStorage(1)).toBe(false)
        })
    })

    describe('dayId storage integration', () => {
        it('startDraft with dayId saves to storage', () => {
            store.startDraft(1)

            expect(localStorage.getItem('register_draft_1')).not.toBeNull()
        })

        it('addItem with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 2, null, null, 1)

            const raw = localStorage.getItem('register_draft_1')
            expect(raw).not.toBeNull()
            const parsed = JSON.parse(raw!)
            expect(parsed.items).toHaveLength(1)
        })

        it('removeItem with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, null, 1)
            store.removeItem(0, 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.items).toHaveLength(0)
        })

        it('updateItemQuantity with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, null, 1)
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

        it('applyVoucher with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, null, 1)
            store.applyVoucher(0, makeVoucher(), 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.items[0].voucherId).toBe(100)
        })

        it('clearVoucherForItem with dayId saves to storage', () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, makeVoucher(), 1)
            store.clearVoucherForItem(0, 1)

            const raw = localStorage.getItem('register_draft_1')
            const parsed = JSON.parse(raw!)
            expect(parsed.items[0].voucherId).toBeNull()
        })

        it('finalizeTicket clears storage', async () => {
            store.startDraft(1)
            store.addItem(makeProduct(), 1, null, null, 1)
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
