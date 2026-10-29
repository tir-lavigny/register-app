<script setup lang="ts">
import { computed, ref } from 'vue'

import { useRegisterTicketsRefund } from '@/api/generated/ticket/ticket'
import type { TicketItemResource, TicketResource } from '@/api/model'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { newIdempotencyKey } from '@/lib/idempotency'
import { Permissions, hasPermission } from '@/lib/permissions'

const props = defineProps<{
    ticket: TicketResource
}>()

const emit = defineEmits<{
    refunded: []
}>()

const showRefundDialog = ref(false)
const isRefunding = ref(false)

const canRefund = hasPermission(Permissions.REFUND_TICKET)
const isAlreadyRefunded = !!props.ticket.deleted_at

const refundMutation = useRegisterTicketsRefund()

type VoucherLike = NonNullable<TicketItemResource['voucher']>

function voucherLabel(voucher: VoucherLike): string {
    if (voucher.discount_percent)
        return `-${Number.parseFloat(voucher.discount_percent)}%`
    if (voucher.discount_fixed)
        return `-${Number.parseFloat(voucher.discount_fixed).toFixed(2)} CHF`
    return 'Bon'
}

interface ItemGroup {
    productId: number
    name: string
    quantity: number
    unitPrice: number
    subtotal: number
    saved: number
    vouchers: { id: number; label: string }[]
}

const groups = computed(() => {
    const map = new Map<number, ItemGroup>()

    for (const item of props.ticket.ticketItems ?? []) {
        let group = map.get(item.product_id)
        if (!group) {
            group = {
                productId: item.product_id,
                name: item.product?.name ?? `Produit #${item.product_id}`,
                quantity: 0,
                unitPrice: Number.parseFloat(item.unit_price),
                subtotal: 0,
                saved: 0,
                vouchers: [],
            }
            map.set(item.product_id, group)
        }
        group.quantity += item.quantity
        group.subtotal += Number.parseFloat(item.subtotal)
        if (item.voucher) {
            group.vouchers.push({
                id: item.voucher.id,
                label: voucherLabel(item.voucher),
            })
        }
    }

    return [...map.values()].map((group) => ({
        ...group,
        saved: Math.max(
            0,
            Math.round(
                (group.unitPrice * group.quantity - group.subtotal) * 100
            ) / 100
        ),
    }))
})

function formatPayment(method: string): string {
    if (method === 'cash') return 'Espèces'
    if (method === 'twint') return 'TWINT'
    return method
}

async function handleRefund() {
    isRefunding.value = true
    try {
        await refundMutation.mutateAsync({
            ticket: props.ticket.id,
            headers: { 'Idempotency-Key': newIdempotencyKey() },
        })
        emit('refunded')
        showRefundDialog.value = false
    } catch (error) {
        console.error('Erreur lors du remboursement:', error)
    } finally {
        isRefunding.value = false
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground"
                >Ticket #{{ ticket.id }}</span
            >
            <span
                v-if="isAlreadyRefunded"
                class="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
            >
                Annulé
            </span>
        </div>

        <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Paiement</span>
            <span class="text-sm font-medium">{{
                formatPayment(ticket.payment_method)
            }}</span>
        </div>

        <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Total</span>
            <span class="text-sm font-bold"
                >{{ Number.parseFloat(ticket.total).toFixed(2) }} CHF</span
            >
        </div>

        <div v-if="groups.length" class="border-t pt-4">
            <h3 class="mb-2 text-sm font-semibold">Articles</h3>
            <div class="flex flex-col gap-2">
                <div
                    v-for="group in groups"
                    :key="group.productId"
                    class="flex items-center justify-between"
                >
                    <div class="flex-1 min-w-0">
                        <span class="block truncate text-sm font-medium">{{
                            group.name
                        }}</span>
                        <span class="text-xs text-muted-foreground">
                            {{ group.unitPrice.toFixed(2) }} CHF ×
                            {{ group.quantity }}
                            <span
                                v-for="voucher in group.vouchers"
                                :key="voucher.id"
                                class="ml-1 inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-600"
                            >
                                Bon {{ voucher.label }}
                            </span>
                        </span>
                    </div>
                    <div class="text-right">
                        <span
                            v-if="group.saved > 0"
                            class="block text-xs text-green-600"
                        >
                            (-{{ group.saved.toFixed(2) }} CHF)
                        </span>
                        <span class="text-sm font-medium">
                            {{ group.subtotal.toFixed(2) }} CHF
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="!isAlreadyRefunded && canRefund" class="border-t pt-4">
            <AlertDialog v-model:open="showRefundDialog">
                <AlertDialogTrigger as-child>
                    <Button
                        variant="destructive"
                        class="w-full"
                        :disabled="isRefunding"
                    >
                        Rembourser le ticket
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Confirmer le remboursement
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir rembourser le ticket #{{
                                ticket.id
                            }}
                            ?
                            <br />
                            <strong
                                >{{
                                    Number.parseFloat(ticket.total).toFixed(2)
                                }}
                                CHF</strong
                            >
                            - {{ formatPayment(ticket.payment_method) }}
                            <br />
                            Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel :disabled="isRefunding">
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            :disabled="isRefunding"
                            @click="handleRefund"
                        >
                            Rembourser
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
</template>
