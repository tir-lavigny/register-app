import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
    registerTicketsPreview,
    registerTicketsStore,
} from '@/api/generated/ticket/ticket'
import type {
    ProductResource,
    RegisterTicketsPreview200,
    StoreTicketRequestPaymentMethod,
    Voucher,
} from '@/api/model'
import { newIdempotencyKey } from '@/lib/idempotency'
import { useStockLocationStore } from '@/stores/stock-location'

export interface TicketDraftItem {
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    customUnitPrice: number | null
    effectivePrice: number
    voucherIds: number[]
    appliedVouchers: Voucher[]
    lineTotal: number
    product?: ProductResource
}

export interface TicketDraft {
    items: TicketDraftItem[]
    paymentMethod: StoreTicketRequestPaymentMethod | null
    memberId: number | null
    memberName: string | null
}

function round2(value: number): number {
    return Math.round(value * 100) / 100
}

function computeVoucherUnitDiscount(
    voucher: Voucher,
    effectivePrice: number
): number {
    if (
        voucher.discount_percent !== null &&
        voucher.discount_percent !== undefined
    ) {
        const percent = Number.parseFloat(voucher.discount_percent)
        return round2(
            Math.min(effectivePrice, (effectivePrice * percent) / 100)
        )
    }
    if (
        voucher.discount_fixed !== null &&
        voucher.discount_fixed !== undefined
    ) {
        return round2(
            Math.min(effectivePrice, Number.parseFloat(voucher.discount_fixed))
        )
    }
    return 0
}

export function computeItemSaved(item: {
    effectivePrice: number
    quantity: number
    appliedVouchers: Voucher[]
}): number {
    const subtotal = item.effectivePrice * item.quantity
    const saved = item.appliedVouchers.reduce(
        (sum, voucher) =>
            sum + computeVoucherUnitDiscount(voucher, item.effectivePrice),
        0
    )
    return round2(Math.min(saved, subtotal))
}

function computeLineTotal(item: {
    effectivePrice: number
    quantity: number
    appliedVouchers: Voucher[]
}): number {
    return round2(
        Math.max(
            0,
            item.effectivePrice * item.quantity - computeItemSaved(item)
        )
    )
}

function buildPreviewPayload(draft: TicketDraft, operatingDayId: number) {
    const locationStore = useStockLocationStore()
    const stockLocationId = locationStore.activeLocationId
    if (stockLocationId === null) {
        throw new Error('Aucun emplacement sélectionné.')
    }
    return {
        payment_method: draft.paymentMethod as StoreTicketRequestPaymentMethod,
        operating_day_id: operatingDayId,
        member_id: draft.memberId,
        sold_at: new Date().toISOString(),
        stock_location_id: stockLocationId,
        items: draft.items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            custom_unit_price: item.customUnitPrice,
            voucher_ids: item.voucherIds,
        })),
    }
}

function getDraftStorageKey(dayId: number): string {
    return `register_draft_${dayId}`
}

function normalizeDraftItem(item: Record<string, unknown>): TicketDraftItem {
    const appliedVouchers = Array.isArray(item.appliedVouchers)
        ? (item.appliedVouchers as Voucher[])
        : []
    const voucherIds = Array.isArray(item.voucherIds)
        ? (item.voucherIds as number[])
        : appliedVouchers.map((voucher) => voucher.id)

    const normalized: TicketDraftItem = {
        productId: Number(item.productId),
        productName: String(item.productName ?? ''),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        customUnitPrice: (item.customUnitPrice as number | null) ?? null,
        effectivePrice: Number(item.effectivePrice),
        voucherIds,
        appliedVouchers,
        lineTotal: 0,
        product: (item.product as ProductResource | undefined) ?? undefined,
    }
    normalized.lineTotal = computeLineTotal(normalized)
    return normalized
}

export const useTicketStore = defineStore('ticket', () => {
    const draft = ref<TicketDraft | null>(null)
    const preview = ref<RegisterTicketsPreview200 | null>(null)
    const previewLoading = ref(false)
    const previewError = ref<string | null>(null)

    const canFinalize = computed(
        () =>
            draft.value !== null &&
            draft.value.items.length > 0 &&
            draft.value.paymentMethod !== null
    )

    function saveDraftToStorage(dayId: number) {
        if (draft.value) {
            localStorage.setItem(
                getDraftStorageKey(dayId),
                JSON.stringify(draft.value)
            )
        }
    }

    function loadDraftFromStorage(dayId: number): TicketDraft | null {
        const raw = localStorage.getItem(getDraftStorageKey(dayId))
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as TicketDraft
                return {
                    ...parsed,
                    items: (parsed.items ?? []).map((item) =>
                        normalizeDraftItem(
                            item as unknown as Record<string, unknown>
                        )
                    ),
                }
            } catch {
                return null
            }
        }
        return null
    }

    function clearDraftStorage(dayId: number) {
        localStorage.removeItem(getDraftStorageKey(dayId))
    }

    function hasDraftInStorage(dayId: number): boolean {
        return localStorage.getItem(getDraftStorageKey(dayId)) !== null
    }

    function startDraft(dayId?: number) {
        draft.value = {
            items: [],
            paymentMethod: null,
            memberId: null,
            memberName: null,
        }
        preview.value = null
        previewError.value = null
        if (dayId !== undefined) {
            saveDraftToStorage(dayId)
        }
    }

    function addItem(
        product: ProductResource,
        quantity: number,
        customPrice: number | null = null,
        vouchers: Voucher[] = [],
        dayId?: number
    ) {
        if (!draft.value) return

        const unitPrice = Number.parseFloat(product.unit_price)
        const effectivePrice = customPrice ?? unitPrice

        const existingIndex = draft.value.items.findIndex(
            (i) => i.productId === product.id
        )

        const newItem: TicketDraftItem = {
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            customUnitPrice: customPrice,
            effectivePrice,
            voucherIds: vouchers.map((voucher) => voucher.id),
            appliedVouchers: vouchers,
            lineTotal: 0,
            product,
        }
        newItem.lineTotal = computeLineTotal(newItem)

        if (existingIndex >= 0) {
            const existing = draft.value.items[existingIndex]
            const appliedVouchers = existing.appliedVouchers.length
                ? existing.appliedVouchers
                : vouchers
            const merged: TicketDraftItem = {
                ...existing,
                quantity: existing.quantity + quantity,
                customUnitPrice: customPrice ?? existing.customUnitPrice,
                effectivePrice:
                    customPrice ?? existing.effectivePrice ?? unitPrice,
                appliedVouchers,
                voucherIds: appliedVouchers.map((voucher) => voucher.id),
            }
            merged.lineTotal = computeLineTotal(merged)
            draft.value.items[existingIndex] = merged
        } else {
            draft.value.items.push(newItem)
        }

        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    function removeItem(index: number, dayId?: number) {
        if (!draft.value) return
        draft.value.items.splice(index, 1)
        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    function updateItemQuantity(
        index: number,
        quantity: number,
        dayId?: number
    ) {
        if (!draft.value) return
        const item = draft.value.items[index]
        if (!item) return

        const appliedVouchers = item.appliedVouchers.slice(0, quantity)
        draft.value.items[index] = {
            ...item,
            quantity,
            appliedVouchers,
            voucherIds: appliedVouchers.map((voucher) => voucher.id),
            lineTotal: computeLineTotal({ ...item, quantity, appliedVouchers }),
        }
        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    function setPaymentMethod(
        method: StoreTicketRequestPaymentMethod,
        dayId?: number
    ) {
        if (!draft.value) return
        draft.value.paymentMethod = method
        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    function setMember(id: number | null, name: string | null, dayId?: number) {
        if (!draft.value) return
        draft.value.memberId = id
        draft.value.memberName = name
        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    function applyVouchers(index: number, vouchers: Voucher[], dayId?: number) {
        if (!draft.value) return
        const item = draft.value.items[index]
        if (!item) return

        const appliedVouchers = vouchers.slice(0, item.quantity)
        draft.value.items[index] = {
            ...item,
            voucherIds: appliedVouchers.map((voucher) => voucher.id),
            appliedVouchers,
            lineTotal: computeLineTotal({ ...item, appliedVouchers }),
        }
        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    function clearVouchersForItem(index: number, dayId?: number) {
        if (!draft.value) return
        const item = draft.value.items[index]
        if (!item) return
        draft.value.items[index] = {
            ...item,
            voucherIds: [],
            appliedVouchers: [],
            lineTotal: computeLineTotal({
                ...item,
                appliedVouchers: [],
            }),
        }
        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    async function fetchPreview(operatingDayId: number) {
        if (!draft.value || draft.value.items.length === 0) {
            preview.value = null
            previewError.value = null
            return
        }

        previewLoading.value = true
        try {
            const payload = buildPreviewPayload(draft.value, operatingDayId)
            const response = await registerTicketsPreview(payload)
            if (response.status === 200) {
                preview.value = response.data
                previewError.value = null
            } else {
                const data = response.data as { message?: string } | undefined
                previewError.value =
                    data?.message ?? 'Impossible de calculer le total.'
            }
        } catch {
            previewError.value = 'Impossible de calculer le total.'
        } finally {
            previewLoading.value = false
        }
    }

    async function finalizeTicket(
        operatingDayId: number
    ): Promise<
        | { success: true; items: TicketDraftItem[] }
        | { success: false; error: string; errors?: Record<string, string[]> }
    > {
        if (!draft.value || !canFinalize.value) {
            return { success: false, error: 'Le ticket est vide.' }
        }

        const payload = buildPreviewPayload(draft.value, operatingDayId)
        try {
            const response = await registerTicketsStore(payload, {
                'Idempotency-Key': newIdempotencyKey(),
            })

            if (response.status === 201) {
                const finalizedItems = [...(draft.value.items ?? [])]
                draft.value = null
                preview.value = null
                previewError.value = null
                clearDraftStorage(operatingDayId)
                return { success: true, items: finalizedItems }
            }

            if (response.status === 422) {
                return {
                    success: false,
                    error: response.data.message,
                    errors: response.data.errors ?? undefined,
                }
            }

            return {
                success: false,
                error: 'Une erreur inattendue est survenue.',
            }
        } catch {
            return {
                success: false,
                error: 'Une erreur inattendue est survenue.',
            }
        }
    }

    return {
        draft,
        preview,
        previewLoading,
        previewError,
        canFinalize,
        startDraft,
        addItem,
        removeItem,
        updateItemQuantity,
        setPaymentMethod,
        setMember,
        applyVouchers,
        clearVouchersForItem,
        fetchPreview,
        finalizeTicket,
        saveDraftToStorage,
        loadDraftFromStorage,
        clearDraftStorage,
        hasDraftInStorage,
    }
})
