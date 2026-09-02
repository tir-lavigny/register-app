<script setup lang="ts">
import type { TicketDraftItem } from '@/stores/ticket'
import { Button } from '@/components/ui/button'

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
      <span class="block truncate text-sm font-medium text-gray-900">{{ item.productName }}</span>
      <span class="text-xs text-gray-500">
        {{ item.effectivePrice.toFixed(2) }} CHF
        <span v-if="item.voucherDiscount" class="text-green-600">
          (-{{ item.voucherDiscount.toFixed(2) }} CHF)
        </span>
      </span>
    </div>
    <div class="flex items-center gap-1">
      <Button variant="outline" size="icon" class="min-h-11 min-w-11" @click="decrementQty(index, item.quantity)">-</Button>
      <span class="min-w-8 text-center text-sm font-bold">{{ item.quantity }}</span>
      <Button variant="outline" size="icon" class="min-h-11 min-w-11" @click="incrementQty(index, item.quantity)">+</Button>
    </div>
    <span class="min-w-16 text-right text-sm font-medium">{{ item.lineTotal.toFixed(2) }} CHF</span>
    <Button variant="ghost" size="icon" class="min-h-11 min-w-11" @click="emit('apply-voucher', index)">
      <span v-if="item.voucherId" class="text-green-600">🏷</span>
      <span v-else class="text-gray-400">🏷</span>
    </Button>
    <Button variant="ghost" size="icon" class="min-h-11 min-w-11 text-red-500" @click="emit('remove', index)">✕</Button>
  </div>
</template>