<script setup lang="ts">
import { Tag, X } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import type { TicketDraftItem } from '@/stores/ticket'

defineProps<{
    item: TicketDraftItem
    index: number
}>()

const emit = defineEmits<{
    'update-quantity': [payload: { index: number; quantity: number }]
    remove: [index: number]
    'apply-voucher': [index: number]
}>()

function incrementQty(index: number, qty: number) {
    emit('update-quantity', { index, quantity: qty + 1 })
}

function decrementQty(index: number, qty: number) {
    if (qty > 1) {
        emit('update-quantity', { index, quantity: qty - 1 })
    }
}
</script>

<template>
    <div class="flex items-center gap-3 rounded-lg border px-3 py-2">
        <div class="flex-1 min-w-0">
            <span class="block truncate text-sm font-medium text-foreground">{{
                item.productName
            }}</span>
            <span class="text-xs text-muted-foreground">
                {{ item.effectivePrice.toFixed(2) }} CHF
                <span v-if="item.voucherDiscount" class="text-green-600">
                    (-{{ item.voucherDiscount.toFixed(2) }} CHF)
                </span>
            </span>
        </div>
        <div class="flex items-center gap-1">
            <Button
                variant="outline"
                size="icon"
                class="min-h-11 min-w-11"
                @click="decrementQty(index, item.quantity)"
                >-</Button
            >
            <span class="min-w-8 text-center text-sm font-bold">{{
                item.quantity
            }}</span>
            <Button
                variant="outline"
                size="icon"
                class="min-h-11 min-w-11"
                @click="incrementQty(index, item.quantity)"
                >+</Button
            >
        </div>
        <span class="min-w-16 text-right text-sm font-medium"
            >{{ item.lineTotal.toFixed(2) }} CHF</span
        >
        <Button
            variant="ghost"
            size="icon"
            class="min-h-11 min-w-11"
            @click="emit('apply-voucher', index)"
        >
            <Tag v-if="item.voucherId" class="size-4 text-green-600" />
            <Tag v-else class="size-4 text-muted-foreground" />
        </Button>
        <Button
            variant="ghost"
            size="icon"
            class="min-h-11 min-w-11 text-destructive"
            @click="emit('remove', index)"
            ><X class="size-4"
        /></Button>
    </div>
</template>
