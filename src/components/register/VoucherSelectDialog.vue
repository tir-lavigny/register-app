<script setup lang="ts">
import { computed } from 'vue'

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
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    select: [voucher: Voucher | null]
}>()

const { data: vouchersData, isLoading } = useRegisterMembersVouchers(
    props.memberId,
    {
        query: { enabled: computed(() => props.open && props.memberId > 0) },
    }
)

const vouchers = computed(() => {
    const all = extractData<Voucher>(vouchersData.value)
    return all.filter((v) => v.product_id === props.productId)
})

function formatDiscount(voucher: Voucher): string {
    if (voucher.discount_percent)
        return `${Number.parseFloat(voucher.discount_percent)}%`
    if (voucher.discount_fixed)
        return `${Number.parseFloat(voucher.discount_fixed).toFixed(2)} CHF`
    return ''
}

function handleSelect(voucher: Voucher) {
    emit('select', voucher)
    emit('update:open', false)
}

function handleClear() {
    emit('select', null)
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
                    <span class="text-sm text-muted-foreground">Chargement...</span>
                </div>

                <div v-else class="max-h-80 overflow-y-auto">
                    <div
                        v-for="voucher in vouchers"
                        :key="voucher.id"
                        class="flex min-h-12 cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                        @click="handleSelect(voucher)"
                    >
                        <span class="text-sm font-medium"
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
            </div>

            <DialogFooter>
                <Button variant="outline" @click="handleClear">Sans bon</Button>
                <Button variant="ghost" @click="emit('update:open', false)"
                    >Fermer</Button
                >
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
