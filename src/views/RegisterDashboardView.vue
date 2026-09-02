<script setup lang="ts">
import { Receipt, Ticket, XCircle } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import CloseDayDialog from '@/components/register/CloseDayDialog.vue'
import DayStatusCard from '@/components/register/DayStatusCard.vue'
import DaySummaryCard from '@/components/register/DaySummaryCard.vue'
import NoSeasonBanner from '@/components/register/NoSeasonBanner.vue'
import OpenDayDialog from '@/components/register/OpenDayDialog.vue'
import ReopenDayDialog from '@/components/register/ReopenDayDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AppLayout from '@/layouts/AppLayout.vue'
import { Permissions, hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useSeasonStore } from '@/stores/season'

const router = useRouter()
const seasonStore = useSeasonStore()
const dayStore = useOperatingDayStore()
const authStore = useAuthStore()

const showOpenDialog = ref(false)
const showCloseDialog = ref(false)
const showReopenDialog = ref(false)

const canCreateTicket = computed(() => hasPermission(Permissions.CREATE_TICKET))
const canCloseDay = computed(() => hasPermission(Permissions.CLOSE_DAY))
const canViewTickets = computed(() => hasPermission(Permissions.VIEW_TICKETS))

const initialRemark = computed(
    () => dayStore.currentDay?.cash_remark ?? undefined
)

onMounted(async () => {
    await seasonStore.fetchCurrentSeason()
    if (seasonStore.seasonId) {
        await dayStore.fetchCurrentDay()
    }
})

async function debugTestRefresh() {
    console.log('[DEBUG] Token before:', authStore.accessToken?.substring(0, 20) + '...')
    console.log('[DEBUG] User before:', authStore.user?.name)
    console.log('[DEBUG] Calling /auth/register/seasons/current to trigger potential 401...')
    try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/register/seasons/current`)
        console.log('[DEBUG] Response status:', res.status)
    } catch (e) {
        console.log('[DEBUG] Error:', e)
    }
    console.log('[DEBUG] Token after:', authStore.accessToken?.substring(0, 20) + '...')
    console.log('[DEBUG] User after:', authStore.user?.name)
}
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
                    v-if="canCreateTicket"
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
                    v-if="canViewTickets"
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
                    v-if="dayStore.isOpen && canCloseDay"
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

            <Button variant="outline" size="sm" class="mt-4" @click="debugTestRefresh">
                [DEBUG] Test Refresh Token
            </Button>
        </div>
    </AppLayout>
</template>
