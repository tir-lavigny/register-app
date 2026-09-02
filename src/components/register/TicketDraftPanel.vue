<script setup lang="ts">
import { computed, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useTicketStore } from '@/stores/ticket'

import PaymentSelector from './PaymentSelector.vue'
import TicketDraftItemRow from './TicketDraftItemRow.vue'

const ticketStore = useTicketStore()
const dayStore = useOperatingDayStore()

const items = computed(() => ticketStore.draft?.items ?? [])
const total = computed(() => ticketStore.preview?.total ?? 0)
const canFinalize = computed(() => ticketStore.canFinalize)
const paymentMethod = computed(() => ticketStore.draft?.paymentMethod ?? null)

watch(
    () => ticketStore.draft,
    () => {
        if (dayStore.currentDay?.id && ticketStore.draft?.items.length) {
            ticketStore.fetchPreview(dayStore.currentDay.id)
        }
    },
    { deep: true }
)

function handleUpdateQuantity(payload: { index: number; quantity: number }) {
    ticketStore.updateItemQuantity(payload.index, payload.quantity)
}

function handleRemove(index: number) {
    ticketStore.removeItem(index)
}

function handleApplyVoucher(index: number) {
    // Will be connected to VoucherSelectDialog from parent
    emit('apply-voucher', index)
}

function handlePaymentMethodUpdate(method: 'cash' | 'twint' | null) {
    ticketStore.setPaymentMethod(method as 'cash' | 'twint')
}

async function handleFinalize() {
    if (!dayStore.currentDay?.id) return
    await ticketStore.finalizeTicket(dayStore.currentDay.id)
    emit('finalized')
}

const emit = defineEmits<{
    'apply-voucher': [index: number]
    finalized: []
}>()
</script>

<template>
    <Card class="flex flex-col">
        <CardHeader>
            <CardTitle class="text-lg">Ticket</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-1 flex-col gap-3">
            <div
                v-if="items.length === 0"
                class="flex items-center justify-center py-8"
            >
                <span class="text-sm text-gray-500">Aucun article</span>
            </div>
            <div v-else class="flex flex-col gap-2">
                <TicketDraftItemRow
                    v-for="(item, index) in items"
                    :key="item.productId"
                    :item="item"
                    :index="index"
                    @update-quantity="handleUpdateQuantity"
                    @remove="handleRemove"
                    @apply-voucher="handleApplyVoucher"
                />
            </div>

            <div class="border-t pt-3">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-500">Total</span>
                    <span class="text-lg font-bold"
                        >{{ total.toFixed(2) }} CHF</span
                    >
                </div>
            </div>

            <PaymentSelector
                :model-value="paymentMethod"
                @update:model-value="handlePaymentMethodUpdate"
            />

            <Button
                size="lg"
                class="min-h-12 w-full text-base font-bold"
                :disabled="!canFinalize"
                @click="handleFinalize"
            >
                Valider
            </Button>
        </CardContent>
    </Card>
</template>
