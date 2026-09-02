<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import { toast } from 'vue-sonner'

import type { Product, Voucher } from '@/api/model'
import { Button } from '@/components/ui/button'
import MemberSelectDialog from '@/components/register/MemberSelectDialog.vue'
import PaymentSelector from '@/components/register/PaymentSelector.vue'
import ProductGrid from '@/components/register/ProductGrid.vue'
import QuantityDialog from '@/components/register/QuantityDialog.vue'
import TicketDraftItemRow from '@/components/register/TicketDraftItemRow.vue'
import VoucherSelectDialog from '@/components/register/VoucherSelectDialog.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useTicketStore } from '@/stores/ticket'

const router = useRouter()
const dayStore = useOperatingDayStore()
const ticketStore = useTicketStore()

const showQuantityDialog = ref(false)
const selectedProduct = ref<Product | null>(null)
const showMemberDialog = ref(false)
const showVoucherDialog = ref(false)
const voucherTargetIndex = ref(-1)

const items = computed(() => ticketStore.draft?.items ?? [])
const total = computed(() => ticketStore.preview?.total ?? 0)
const canFinalize = computed(() => ticketStore.canFinalize)
const memberName = computed(() => ticketStore.draft?.memberName)

onMounted(async () => {
    if (!dayStore.currentDay) {
        await dayStore.fetchCurrentDay()
    }
    if (!dayStore.isOpen) {
        router.replace('/register')
        return
    }
    if (!ticketStore.draft) {
        ticketStore.startDraft()
    }
})

function handleSelectProduct(product: Product) {
    selectedProduct.value = product
    showQuantityDialog.value = true
}

function handleQuantityConfirm(payload: {
    quantity: number
    customPrice: number | null
}) {
    if (!selectedProduct.value) return
    ticketStore.addItem(
        selectedProduct.value,
        payload.quantity,
        payload.customPrice
    )
    if (dayStore.dayId) {
        ticketStore.fetchPreview(dayStore.dayId)
    }
    selectedProduct.value = null
}

function handleUpdateQuantity(payload: {
    index: number
    quantity: number
}) {
    ticketStore.updateItemQuantity(payload.index, payload.quantity)
    if (dayStore.dayId) {
        ticketStore.fetchPreview(dayStore.dayId)
    }
}

function handleRemoveItem(index: number) {
    ticketStore.removeItem(index)
    if (dayStore.dayId) {
        ticketStore.fetchPreview(dayStore.dayId)
    }
}

function handleApplyVoucher(index: number) {
    if (!ticketStore.draft?.memberId) {
        showMemberDialog.value = true
        return
    }
    voucherTargetIndex.value = index
    showVoucherDialog.value = true
}

function handleMemberSelect(member: { id: number; name: string } | null) {
    if (member) {
        ticketStore.setMember(member.id, member.name)
    } else {
        ticketStore.setMember(null, null)
    }
}

function handleVoucherSelect(voucher: Voucher | null) {
    const index = voucherTargetIndex.value
    if (index < 0 || !ticketStore.draft) return

    const item = ticketStore.draft.items[index]
    if (!item) return

    if (voucher) {
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
        const newLineTotal = Math.max(0, subtotal - discount)
        ticketStore.draft.items[index] = {
            ...item,
            voucherId: voucher.id,
            voucherDiscount: discount,
            lineTotal: newLineTotal,
        }
    } else {
        ticketStore.clearVoucherForItem(index)
    }
    showVoucherDialog.value = false
    voucherTargetIndex.value = -1
}

async function handleFinalize() {
    if (!dayStore.dayId) return
    const result = await ticketStore.finalizeTicket(dayStore.dayId)
    if (result.success) {
        toast.success('Ticket créé avec succès!')
        await dayStore.refreshDay()
        ticketStore.startDraft()
        router.push('/register')
    } else {
        toast.error(result.error)
    }
}
</script>

<template>
    <AppLayout>
        <div class="flex flex-1 flex-col gap-4 p-4">
            <div class="flex items-center gap-3">
                <Button variant="ghost" size="icon" @click="router.push('/register')">
                    <ArrowLeft class="size-5" />
                </Button>
                <h1 class="flex-1 text-xl font-bold">Nouveau ticket</h1>
                <span class="text-lg font-bold">
                    {{ total.toFixed(2) }} CHF
                </span>
            </div>

            <ProductGrid @select-product="handleSelectProduct" />

            <div class="flex flex-col gap-3 border-t pt-4">
                <div v-if="items.length === 0" class="py-8 text-center text-sm text-gray-500">
                    Sélectionnez un produit pour commencer
                </div>
                <template v-else>
                    <TicketDraftItemRow
                        v-for="(item, index) in items"
                        :key="item.productId"
                        :item="item"
                        :index="index"
                        @update-quantity="handleUpdateQuantity"
                        @remove="handleRemoveItem"
                        @apply-voucher="handleApplyVoucher"
                    />

                    <div class="flex items-center justify-between border-t pt-3">
                        <span class="text-sm text-gray-500">
                            Membre: {{ memberName ?? 'Aucun' }}
                        </span>
                        <Button variant="ghost" size="sm" @click="showMemberDialog = true">
                            {{ memberName ? 'Changer' : 'Sélectionner' }}
                        </Button>
                    </div>

                    <PaymentSelector
                        :model-value="ticketStore.draft?.paymentMethod ?? null"
                        @update:model-value="(v) => v && ticketStore.setPaymentMethod(v)"
                    />

                    <Button
                        size="lg"
                        class="min-h-14 w-full text-base font-bold"
                        :disabled="!canFinalize"
                        @click="handleFinalize"
                    >
                        Valider — {{ total.toFixed(2) }} CHF
                    </Button>
                </template>
            </div>

            <QuantityDialog
                v-model:open="showQuantityDialog"
                :product="selectedProduct"
                @confirm="handleQuantityConfirm"
            />

            <MemberSelectDialog
                v-model:open="showMemberDialog"
                @select="handleMemberSelect"
            />

            <VoucherSelectDialog
                v-model:open="showVoucherDialog"
                :member-id="ticketStore.draft?.memberId ?? 0"
                :product-id="
                    voucherTargetIndex >= 0 && ticketStore.draft?.items[voucherTargetIndex]
                        ? ticketStore.draft.items[voucherTargetIndex].productId
                        : 0
                "
                @select="handleVoucherSelect"
            />
        </div>
    </AppLayout>
</template>
