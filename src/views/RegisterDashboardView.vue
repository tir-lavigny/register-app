<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { Receipt, Ticket, XCircle } from '@lucide/vue'

import { Card, CardContent } from '@/components/ui/card'
import CloseDayDialog from '@/components/register/CloseDayDialog.vue'
import DayStatusCard from '@/components/register/DayStatusCard.vue'
import DaySummaryCard from '@/components/register/DaySummaryCard.vue'
import NoSeasonBanner from '@/components/register/NoSeasonBanner.vue'
import OpenDayDialog from '@/components/register/OpenDayDialog.vue'
import ReopenDayDialog from '@/components/register/ReopenDayDialog.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useSeasonStore } from '@/stores/season'

const router = useRouter()
const seasonStore = useSeasonStore()
const dayStore = useOperatingDayStore()

const showOpenDialog = ref(false)
const showCloseDialog = ref(false)
const showReopenDialog = ref(false)

const initialRemark = computed(() => dayStore.currentDay?.cash_remark ?? undefined)

onMounted(async () => {
    await seasonStore.fetchCurrentSeason()
    if (seasonStore.seasonId) {
        await dayStore.fetchCurrentDay()
    }
})
</script>

<template>
    <AppLayout>
        <NoSeasonBanner v-if="seasonStore.error" />
        <div v-else class="flex flex-1 flex-col gap-4 p-4">
            <h1 class="text-2xl font-bold">Tableau de bord</h1>

            <DayStatusCard
                :loading="dayStore.loading"
                @open="showOpenDialog = true"
                @close="showCloseDialog = true"
                @reopen="showReopenDialog = true"
            />

            <DaySummaryCard
                v-if="dayStore.currentDay"
                :ticket-count="dayStore.activeTickets.length"
                :cash-total="dayStore.cashTotal"
                :twint-total="dayStore.twintTotal"
            />

            <div class="grid gap-4 sm:grid-cols-3">
                <Card
                    class="cursor-pointer transition-colors hover:bg-accent"
                    @click="router.push('/register/ticket/new')"
                >
                    <CardContent
                        class="flex flex-col items-center gap-3 p-6 text-center"
                    >
                        <Receipt class="size-8 text-primary" />
                        <span class="text-lg font-medium">Nouveau ticket</span>
                    </CardContent>
                </Card>

                <Card
                    class="cursor-pointer transition-colors hover:bg-accent"
                    @click="router.push('/register/tickets')"
                >
                    <CardContent
                        class="flex flex-col items-center gap-3 p-6 text-center"
                    >
                        <Ticket class="size-8 text-primary" />
                        <span class="text-lg font-medium">Tickets du jour</span>
                    </CardContent>
                </Card>

                <Card
                    v-if="dayStore.isOpen"
                    class="cursor-pointer transition-colors hover:bg-destructive/10"
                    @click="showCloseDialog = true"
                >
                    <CardContent
                        class="flex flex-col items-center gap-3 p-6 text-center"
                    >
                        <XCircle class="size-8 text-destructive" />
                        <span class="text-lg font-medium"
                            >Fermer la journée</span
                        >
                    </CardContent>
                </Card>
            </div>

            <OpenDayDialog v-model:open="showOpenDialog" />
            <CloseDayDialog
                v-model:open="showCloseDialog"
                :cash-total="dayStore.cashTotal"
                :twint-total="dayStore.twintTotal"
                :ticket-count="dayStore.activeTickets.length"
                :initial-remark="initialRemark"
            />
            <ReopenDayDialog v-model:open="showReopenDialog" />
        </div>
    </AppLayout>
</template>
