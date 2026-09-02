<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'

import type { TicketResource } from '@/api/model'
import { Button } from '@/components/ui/button'
import TicketDetail from '@/components/register/TicketDetail.vue'
import TicketListTable from '@/components/register/TicketListTable.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { hasPermission, Permissions } from '@/lib/permissions'
import { useOperatingDayStore } from '@/stores/operating-day'

const router = useRouter()
const dayStore = useOperatingDayStore()

const selectedTicket = ref<TicketResource | null>(null)
const showDetail = ref(false)

const allTickets = computed(() => [
  ...(dayStore.activeTickets ?? []),
  ...(dayStore.canceledTickets ?? []),
])

const ticketCount = computed(() => dayStore.activeTickets.length)

onMounted(async () => {
  if (!dayStore.currentDay) {
    await dayStore.fetchCurrentDay()
  }
  if (!hasPermission(Permissions.VIEW_TICKETS)) {
    router.replace('/register')
    return
  }
  if (!dayStore.isOpen && !dayStore.currentDay) {
    router.replace('/register')
  }
})

function handleSelectTicket(ticket: TicketResource) {
  selectedTicket.value = ticket
  showDetail.value = true
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-1 flex-col gap-4 p-4">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="router.push('/register')">
          <ArrowLeft class="size-5" />
        </Button>
        <h1 class="flex-1 text-xl font-bold">Tickets du jour</h1>
      </div>

      <TicketListTable
        :tickets="allTickets"
        :cash-total="dayStore.cashTotal"
        :twint-total="dayStore.twintTotal"
        :ticket-count="ticketCount"
        @select="handleSelectTicket"
      />

      <TicketDetail
        v-model:open="showDetail"
        :ticket="selectedTicket"
      />
    </div>
  </AppLayout>
</template>