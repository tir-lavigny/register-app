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
        class="flex min-h-12 w-full flex-col items-center gap-1 rounded-lg border bg-card p-3 text-center transition-colors hover:bg-accent active:bg-accent"
        @click="emit('click', product)"
    >
        <img
            v-if="product.picture"
            :src="product.picture"
            :alt="product.name"
            class="h-16 w-16 rounded object-cover"
        />
        <div
            v-else
            class="flex h-16 w-16 items-center justify-center rounded bg-muted text-muted-foreground"
        >
            <span class="text-xl">?</span>
        </div>
        <span class="mt-1 text-sm font-medium leading-tight text-foreground">{{
            product.name
        }}</span>
        <span class="text-xs text-muted-foreground">{{
            formatPrice(product.unit_price)
        }}</span>
    </button>
</template>
