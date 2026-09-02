<script setup lang="ts">
import type { Product } from '@/api/model'

defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  click: [product: Product]
}>()

function formatPrice(price: string): string {
  return `${Number.parseFloat(price).toFixed(2)} CHF`
}
</script>

<template>
  <button
    type="button"
    class="flex min-h-12 w-full flex-col items-center gap-1 rounded-lg border bg-white p-3 text-center transition-colors hover:bg-gray-50 active:bg-gray-100"
    @click="emit('click', product)"
  >
    <img
      v-if="product.picture"
      :src="product.picture"
      :alt="product.name"
      class="h-16 w-16 rounded object-cover"
    />
    <div v-else class="flex h-16 w-16 items-center justify-center rounded bg-gray-100 text-gray-400">
      <span class="text-xl">?</span>
    </div>
    <span class="mt-1 text-sm font-medium leading-tight text-gray-900">{{ product.name }}</span>
    <span class="text-xs text-gray-500">{{ formatPrice(product.unit_price) }}</span>
  </button>
</template>