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

export interface TicketDraftItem {
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    customUnitPrice: number | null
    effectivePrice: number
    voucherId: number | null
    voucherDiscount: number | null
    lineTotal: number
    product?: ProductResource
}

export interface TicketDraft {
    items: TicketDraftItem[]
    paymentMethod: StoreTicketRequestPaymentMethod | null
    memberId: number | null
    memberName: string | null
}

function computeLineTotal(item: TicketDraftItem): number {
    const subtotal = item.effectivePrice * item.quantity
    if (item.voucherDiscount === null) return subtotal
    return Math.max(0, subtotal - item.voucherDiscount)
}

function computeVoucherDiscount(
    product: ProductResource,
    voucher: Voucher,
    effectivePrice: number,
    quantity: number
): number | null {
    if (voucher.product_id !== product.id) return null
    const subtotal = effectivePrice * quantity
    if (voucher.discount_percent) {
        return (
            Math.round(
                subtotal *
                    (Number.parseFloat(voucher.discount_percent) / 100) *
                    100
            ) / 100
        )
    }
    if (voucher.discount_fixed) {
        return Number.parseFloat(voucher.discount_fixed)
    }
    return null
}

function buildPreviewPayload(draft: TicketDraft, operatingDayId: number) {
    return {
        payment_method: draft.paymentMethod as StoreTicketRequestPaymentMethod,
        operating_day_id: operatingDayId,
        member_id: draft.memberId,
        sold_at: new Date().toISOString(),
        items: draft.items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            custom_unit_price: item.customUnitPrice,
            voucher_id: item.voucherId,
        })),
    }
}

function getDraftStorageKey(dayId: number): string {
    return `register_draft_${dayId}`
}

export const useTicketStore = defineStore('ticket', () => {
    const draft = ref<TicketDraft | null>(null)
    const preview = ref<RegisterTicketsPreview200 | null>(null)
    const previewLoading = ref(false)

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
                return JSON.parse(raw) as TicketDraft
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
        if (dayId !== undefined) {
            saveDraftToStorage(dayId)
        }
    }

    function addItem(
        product: ProductResource,
        quantity: number,
        customPrice: number | null = null,
        voucher: Voucher | null = null,
        dayId?: number
    ) {
        if (!draft.value) return

        const unitPrice = Number.parseFloat(product.unit_price)
        const effectivePrice = customPrice ?? unitPrice
        const voucherDiscount = voucher
            ? computeVoucherDiscount(product, voucher, effectivePrice, quantity)
            : null

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
            voucherId: voucherDiscount !== null ? (voucher?.id ?? null) : null,
            voucherDiscount,
            lineTotal: 0,
            product,
        }
        newItem.lineTotal = computeLineTotal(newItem)

        if (existingIndex >= 0) {
            const existing = draft.value.items[existingIndex]
            const merged: TicketDraftItem = {
                ...existing,
                quantity: existing.quantity + quantity,
                customUnitPrice: customPrice ?? existing.customUnitPrice,
                effectivePrice:
                    customPrice ?? existing.effectivePrice ?? unitPrice,
                voucherId:
                    voucherDiscount !== null
                        ? (voucher?.id ?? existing.voucherId)
                        : existing.voucherId,
                voucherDiscount: voucherDiscount ?? existing.voucherDiscount,
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
        draft.value.items[index] = {
            ...item,
            quantity,
            lineTotal: computeLineTotal({ ...item, quantity }),
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

    function applyVoucher(index: number, voucher: Voucher, dayId?: number) {
        if (!draft.value) return
        const item = draft.value.items[index]
        if (!item) return

        const subtotal = item.effectivePrice * item.quantity
        let discount = 0
        if (voucher.discount_percent) {
            discount =
                Math.round(
                    subtotal *
                        (Number.parseFloat(voucher.discount_percent) / 100) *
                        100
                ) / 100
        } else if (voucher.discount_fixed) {
            discount = Number.parseFloat(voucher.discount_fixed)
        }

        draft.value.items[index] = {
            ...item,
            voucherId: voucher.id,
            voucherDiscount: discount,
            lineTotal: Math.max(0, subtotal - discount),
        }
        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    function clearVoucherForItem(index: number, dayId?: number) {
        if (!draft.value) return
        const item = draft.value.items[index]
        if (!item) return
        draft.value.items[index] = {
            ...item,
            voucherId: null,
            voucherDiscount: null,
            lineTotal: computeLineTotal({
                ...item,
                voucherId: null,
                voucherDiscount: null,
            }),
        }
        if (dayId !== undefined) saveDraftToStorage(dayId)
    }

    async function fetchPreview(operatingDayId: number) {
        if (!draft.value || draft.value.items.length === 0) {
            preview.value = null
            return
        }

        previewLoading.value = true
        try {
            const payload = buildPreviewPayload(draft.value, operatingDayId)
            const response = await registerTicketsPreview(payload)
            if (response.status === 200) {
                preview.value = response.data
            }
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
            const response = await registerTicketsStore(payload)

            if (response.status === 201) {
                const finalizedItems = [...(draft.value.items ?? [])]
                draft.value = null
                preview.value = null
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
        canFinalize,
        startDraft,
        addItem,
        removeItem,
        updateItemQuantity,
        setPaymentMethod,
        setMember,
        applyVoucher,
        clearVoucherForItem,
        fetchPreview,
        finalizeTicket,
        saveDraftToStorage,
        loadDraftFromStorage,
        clearDraftStorage,
        hasDraftInStorage,
    }
})
