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
        class="flex min-h-20 w-full flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center transition-colors hover:bg-accent active:bg-accent"
        @click="emit('click', product)"
    >
        <span class="mt-1 text-sm font-medium leading-tight text-foreground">{{
            product.name
        }}</span>
        <span class="text-sm text-muted-foreground">{{
            formatPrice(product.unit_price)
        }}</span>
    </button>
</template>
