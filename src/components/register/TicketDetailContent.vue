<script setup lang="ts">
import type { TicketResource } from '@/api/model'

defineProps<{
  ticket: TicketResource
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
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">Ticket #{{ ticket.id }}</span>
      <span
        v-if="ticket.deleted_at"
        class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
      >
        Annulé
      </span>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">Heure</span>
      <span class="text-sm font-medium">{{ formatTime(ticket.sold_at) }}</span>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">Paiement</span>
      <span class="text-sm font-medium">{{ formatPayment(ticket.payment_method) }}</span>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-sm text-muted-foreground">Total</span>
      <span class="text-sm font-bold">{{ Number.parseFloat(ticket.total).toFixed(2) }} CHF</span>
    </div>

    <div v-if="ticket.ticketItems?.length" class="border-t pt-4">
      <h3 class="mb-2 text-sm font-semibold">Articles</h3>
      <div class="flex flex-col gap-2">
        <div
          v-for="item in ticket.ticketItems"
          :key="item.id"
          class="flex items-center justify-between"
        >
          <div class="flex-1 min-w-0">
            <span class="block truncate text-sm font-medium">{{ item.product?.name ?? 'Produit #' + item.product_id }}</span>
            <span class="text-xs text-muted-foreground">
              {{ Number.parseFloat(item.unit_price).toFixed(2) }} CHF × {{ item.quantity }}
            </span>
            <span v-if="item.voucher_id" class="ml-1 inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
              Voucher
            </span>
          </div>
          <span class="text-sm font-medium">{{ Number.parseFloat(item.subtotal).toFixed(2) }} CHF</span>
        </div>
      </div>
    </div>
  </div>
</template>