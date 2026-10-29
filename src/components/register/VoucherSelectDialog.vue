<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

import { useRegisterMembersVouchers } from '@/api/generated/member/member'
import type { Voucher } from '@/api/model'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { extractData } from '@/lib/utils'

const props = defineProps<{
    open: boolean
    memberId: number
    productId: number
    selectedIds: number[]
    excludeIds: number[]
    maxSelectable: number
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    select: [vouchers: Voucher[]]
}>()

const { data: vouchersData, isLoading } = useRegisterMembersVouchers(
    () => props.memberId,
    {
        query: { enabled: computed(() => props.open && props.memberId > 0) },
    }
)

const vouchers = computed(() => {
    const all = extractData<Voucher>(vouchersData.value)
    return all.filter(
        (v) =>
            v.product_id === props.productId && !props.excludeIds.includes(v.id)
    )
})

const localSelected = ref<number[]>([...props.selectedIds])

watch(
    () => props.open,
    (open) => {
        if (open) {
            localSelected.value = [...props.selectedIds]
        }
    }
)

const selectedVouchers = computed(() =>
    vouchers.value.filter((voucher) => localSelected.value.includes(voucher.id))
)

function formatDiscount(voucher: Voucher): string {
    if (
        voucher.discount_percent &&
        Number.parseFloat(voucher.discount_percent) > 0
    )
        return `${Number.parseFloat(voucher.discount_percent)}%`
    if (voucher.discount_fixed && Number.parseFloat(voucher.discount_fixed) > 0)
        return `${Number.parseFloat(voucher.discount_fixed).toFixed(2)} CHF`
    return ''
}

function isSelected(voucher: Voucher): boolean {
    return localSelected.value.includes(voucher.id)
}

function isDisabled(voucher: Voucher): boolean {
    return (
        !isSelected(voucher) &&
        localSelected.value.length >= props.maxSelectable
    )
}

function toggle(voucher: Voucher) {
    if (isDisabled(voucher)) return

    const index = localSelected.value.indexOf(voucher.id)
    if (index >= 0) {
        localSelected.value.splice(index, 1)
    } else {
        localSelected.value.push(voucher.id)
    }
}

function handleConfirm() {
    emit('select', selectedVouchers.value)
    emit('update:open', false)
}

function handleClear() {
    emit('select', [])
    emit('update:open', false)
}
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="max-w-sm">
            <DialogHeader>
                <DialogTitle>Sélectionner un bon</DialogTitle>
            </DialogHeader>

            <div class="flex flex-col gap-3">
                <div
                    v-if="isLoading"
                    class="flex items-center justify-center py-4"
                >
                    <span class="text-sm text-muted-foreground"
                        >Chargement...</span
                    >
                </div>

                <div v-else class="max-h-80 overflow-y-auto">
                    <div
                        v-for="voucher in vouchers"
                        :key="voucher.id"
                        class="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                        :class="{
                            'opacity-50': isDisabled(voucher),
                            'bg-accent': isSelected(voucher),
                        }"
                        @click="toggle(voucher)"
                    >
                        <span
                            class="flex size-5 shrink-0 items-center justify-center rounded border"
                            :class="
                                isSelected(voucher)
                                    ? 'border-green-600 bg-green-600 text-white'
                                    : 'border-muted-foreground/40'
                            "
                        >
                            <Check
                                v-if="isSelected(voucher)"
                                class="size-3.5"
                            />
                        </span>
                        <span class="flex-1 text-sm font-medium"
                            >Bon #{{ voucher.id }}</span
                        >
                        <span class="text-xs text-muted-foreground">{{
                            formatDiscount(voucher)
                        }}</span>
                    </div>
                    <div
                        v-if="vouchers.length === 0"
                        class="py-4 text-center text-sm text-muted-foreground"
                    >
                        Aucun bon disponible
                    </div>
                </div>

                <p class="text-xs text-muted-foreground">
                    {{ localSelected.length }} / {{ maxSelectable }} bon(s)
                    sélectionné(s)
                </p>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="handleClear">Sans bon</Button>
                <Button variant="ghost" @click="emit('update:open', false)"
                    >Fermer</Button
                >
                <Button @click="handleConfirm">Appliquer</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
