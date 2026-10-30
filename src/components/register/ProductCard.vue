<script setup lang="ts">
import type { ProductResource } from '@/api/model'

defineProps<{
    product: ProductResource
}>()

const emit = defineEmits<{
    click: [product: ProductResource]
}>()

function formatPrice(price: string): string {
    return `${Number.parseFloat(price).toFixed(2)} CHF`
}
</script>

<template>
    <button
        type="button"
        class="bg-card hover:bg-accent active:bg-accent flex min-h-20 w-full flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors"
        @click="emit('click', product)"
    >
        <span class="text-foreground mt-1 text-sm leading-tight font-medium">{{
            product.name
        }}</span>
        <span class="text-muted-foreground text-sm">{{
            formatPrice(product.unit_price)
        }}</span>
    </button>
</template>
