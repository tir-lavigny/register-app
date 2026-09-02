<script setup lang="ts">
import { Tag } from '@lucide/vue'

import type { TicketResource } from '@/api/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
    tickets: TicketResource[]
    cashTotal: number
    twintTotal: number
    ticketCount: number
}>()

const emit = defineEmits<{
    select: [ticket: TicketResource]
}>()

function formatTime(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })
}

function formatPayment(method: string): string {
    if (method === 'cash') return 'Espèces'
    if (method === 'twint') return 'Twint'
    return method
}

function formatTotal(total: string): string {
    return Number.parseFloat(total).toFixed(2) + ' CHF'
}

function hasVoucher(ticket: TicketResource): boolean {
    return ticket.ticketItems?.some((i) => i.voucher_id !== null) ?? false
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <Card>
            <CardHeader>
                <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Tickets</span>
                    <span class="font-medium">{{ ticketCount }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Espèces</span>
                    <span class="font-medium"
                        >CHF {{ cashTotal.toFixed(2) }}</span
                    >
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Twint</span>
                    <span class="font-medium"
                        >CHF {{ twintTotal.toFixed(2) }}</span
                    >
                </div>
            </CardContent>
        </Card>

        <div
            v-if="tickets.length === 0"
            class="py-12 text-center text-sm text-muted-foreground"
        >
            Aucun ticket pour cette journée
        </div>

        <div v-else class="flex flex-col gap-2">
            <button
                v-for="ticket in tickets"
                :key="ticket.id"
                class="flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent"
                :class="{ 'line-through opacity-60': ticket.deleted_at }"
                @click="emit('select', ticket)"
            >
                <div class="flex-1 min-w-0">
                    <span class="block text-sm font-medium"
                        >Ticket #{{ ticket.id }}</span
                    >
                    <span class="text-xs text-muted-foreground">{{
                        formatTime(ticket.sold_at)
                    }}</span>
                </div>
                <span class="text-xs text-muted-foreground">{{
                    formatPayment(ticket.payment_method)
                }}</span>
                <Tag
                    v-if="hasVoucher(ticket)"
                    class="size-3.5 text-green-600"
                />
                <span class="min-w-20 text-right text-sm font-medium">{{
                    formatTotal(ticket.total)
                }}</span>
            </button>
        </div>
    </div>
</template>
