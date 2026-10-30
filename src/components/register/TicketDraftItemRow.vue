<script setup lang="ts">
import { Minus, Plus, Tag, X } from '@lucide/vue'
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import type { TicketDraftItem } from '@/stores/ticket'
import { computeItemSaved } from '@/stores/ticket'

const props = defineProps<{
    item: TicketDraftItem
    index: number
}>()

const emit = defineEmits<{
    'update-quantity': [payload: { index: number; quantity: number }]
    remove: [index: number]
    'apply-voucher': [index: number]
}>()

const saved = computed(() => computeItemSaved(props.item))

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
    <div
        class="flex flex-col items-center gap-3 rounded-lg border px-3 py-2 sm:flex-row"
    >
        <div
            class="min-w-0 flex-1 justify-items-center sm:justify-items-normal"
        >
            <span class="text-foreground block truncate text-sm font-medium">{{
                item.productName
            }}</span>
            <span class="text-muted-foreground text-xs">
                {{ item.effectivePrice.toFixed(2) }} CHF
                <span v-if="saved > 0" class="text-green-600">
                    (-{{ saved.toFixed(2) }} CHF)
                </span>
                <span
                    v-if="item.appliedVouchers.length > 1"
                    class="text-muted-foreground"
                >
                    · {{ item.appliedVouchers.length }} bon(s)
                </span>
            </span>
        </div>
        <div class="flex flex-col items-center gap-2 sm:flex-row">
            <div class="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    class=""
                    @click="decrementQty(index, item.quantity)"
                    ><Minus class="size-4"
                /></Button>
                <span class="min-w-8 text-center text-sm font-bold">{{
                    item.quantity
                }}</span>
                <Button
                    variant="outline"
                    size="icon"
                    class=""
                    @click="incrementQty(index, item.quantity)"
                >
                    <Plus class="size-4" />
                </Button>
            </div>
            <div class="flex items-center gap-1">
                <span class="min-w-16 text-right text-sm font-medium"
                    >{{ item.lineTotal.toFixed(2) }} CHF</span
                >
                <Button
                    variant="ghost"
                    size="icon"
                    class=""
                    @click="emit('apply-voucher', index)"
                >
                    <Tag
                        v-if="item.voucherIds.length"
                        class="size-4 text-green-600"
                    />
                    <Tag v-else class="text-muted-foreground size-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    class="text-destructive"
                    @click="emit('remove', index)"
                    ><X class="size-4"
                /></Button>
            </div>
        </div>
    </div>
</template>
