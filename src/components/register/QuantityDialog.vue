<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { Product } from '@/api/model'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const props = defineProps<{
    open: boolean
    product: Product | null
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    confirm: [payload: { quantity: number; customPrice: number | null }]
}>()

const quantity = ref(1)
const customPrice = ref('')
const hasTypedQuantity = ref(false)

watch(
    () => props.open,
    (val) => {
        if (val) {
            quantity.value = 1
            hasTypedQuantity.value = false
            if (props.product) {
                customPrice.value = Number.parseFloat(
                    props.product.unit_price
                ).toFixed(2)
            } else {
                customPrice.value = ''
            }
        }
    }
)

function formatPrice(price: string): string {
    return `${Number.parseFloat(price).toFixed(2)} CHF`
}

const unitPrice = computed(() => {
    if (!props.product) return 0
    return Number.parseFloat(props.product.unit_price)
})

const effectivePrice = computed(() => {
    if (!props.product) return 0
    if (props.product.allows_custom_price && customPrice.value) {
        return Number.parseFloat(customPrice.value) || 0
    }
    return unitPrice.value
})

const lineTotal = computed(() => effectivePrice.value * quantity.value)

function handleNumpad(digit: string) {
    if (!hasTypedQuantity.value) {
        quantity.value = Number(digit)
        hasTypedQuantity.value = true
    } else {
        quantity.value = Number(quantity.value.toString() + digit)
    }
}

function handleBackspace() {
    const str = quantity.value.toString()
    if (str.length <= 1) {
        quantity.value = 1
        hasTypedQuantity.value = false
    } else {
        quantity.value = Number(str.slice(0, -1))
    }
}

function handleNumpadPrice(digit: string) {
    customPrice.value = customPrice.value + digit
}

function handleBackspacePrice() {
    if (customPrice.value.length <= 1) {
        customPrice.value = '0'
    } else {
        customPrice.value = customPrice.value.slice(0, -1)
    }
}

function handleConfirm() {
    emit('confirm', {
        quantity: quantity.value,
        customPrice: props.product?.allows_custom_price
            ? Number.parseFloat(customPrice.value) || null
            : null,
    })
    emit('update:open', false)
}

function handleCancel() {
    emit('update:open', false)
}
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="max-w-sm">
            <DialogHeader>
                <DialogTitle>{{ product?.name }}</DialogTitle>
            </DialogHeader>

            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground"
                        >Prix unitaire</span
                    >
                    <span class="text-sm font-medium">{{
                        formatPrice(product?.unit_price ?? '0')
                    }}</span>
                </div>

                <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium text-foreground"
                        >Quantité</label
                    >
                    <div class="flex items-center gap-2">
                        <Input
                            :model-value="String(quantity)"
                            readonly
                            class="text-center text-lg font-bold"
                        />
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                        <Button
                            v-for="digit in [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                            ]"
                            :key="digit"
                            variant="outline"
                            class="min-h-11 text-lg font-bold"
                            @click="handleNumpad(digit)"
                        >
                            {{ digit }}
                        </Button>
                        <Button
                            variant="outline"
                            class="min-h-11 text-lg font-bold"
                            @click="handleNumpad('0')"
                        >
                            0
                        </Button>
                        <Button
                            variant="outline"
                            class="min-h-11 text-lg font-bold"
                            @click="handleBackspace"
                        >
                            ⌫
                        </Button>
                        <div></div>
                    </div>
                </div>

                <div
                    v-if="product?.allows_custom_price"
                    class="flex flex-col gap-2"
                >
                    <label class="text-sm font-medium text-foreground"
                        >Prix personnalisé (CHF)</label
                    >
                    <Input
                        :model-value="customPrice"
                        readonly
                        class="text-center text-lg font-bold"
                    />
                    <div class="grid grid-cols-3 gap-1">
                        <Button
                            v-for="digit in [
                                '1',
                                '2',
                                '3',
                                '4',
                                '5',
                                '6',
                                '7',
                                '8',
                                '9',
                            ]"
                            :key="digit"
                            variant="outline"
                            class="min-h-11 text-lg font-bold"
                            @click="handleNumpadPrice(digit)"
                        >
                            {{ digit }}
                        </Button>
                        <Button
                            variant="outline"
                            class="min-h-11 text-lg font-bold"
                            @click="handleNumpadPrice('0')"
                        >
                            0
                        </Button>
                        <Button
                            variant="outline"
                            class="min-h-11 text-lg font-bold"
                            @click="handleBackspacePrice"
                        >
                            ⌫
                        </Button>
                        <div></div>
                    </div>
                </div>

                <div class="flex items-center justify-between border-t pt-3">
                    <span class="text-sm font-medium text-muted-foreground"
                        >Total</span
                    >
                    <span class="text-lg font-bold"
                        >{{ lineTotal.toFixed(2) }} CHF</span
                    >
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="handleCancel">Annuler</Button>
                <Button :disabled="quantity <= 0" @click="handleConfirm"
                    >Confirmer</Button
                >
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
