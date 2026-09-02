<script setup lang="ts">
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Permissions, hasPermission } from '@/lib/permissions'
import { useOperatingDayStore } from '@/stores/operating-day'

defineProps<{
    loading: boolean
}>()

const emit = defineEmits<{
    open: []
    close: []
    reopen: []
}>()

const dayStore = useOperatingDayStore()

const canOpenDay = computed(() => hasPermission(Permissions.OPEN_DAY))
const canCloseDay = computed(() => hasPermission(Permissions.CLOSE_DAY))
const canReopenDay = computed(() => hasPermission(Permissions.REOPEN_DAY))

function formatDate(iso: string): string {
    const date = new Date(iso)
    return new Intl.DateTimeFormat('fr-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date)
}

function formatTime(iso: string): string {
    const date = new Date(iso)
    return new Intl.DateTimeFormat('fr-CH', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

const dayDate = computed(() =>
    dayStore.currentDay ? formatDate(dayStore.currentDay.date) : ''
)
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <span
                    v-if="dayStore.isOpen"
                    class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                >
                    OUVERT
                </span>
                <span
                    v-else-if="dayStore.currentDay"
                    class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                >
                    FERMÉ
                </span>
                <span v-else class="text-muted-foreground text-sm font-normal">
                    Aucune journée active
                </span>
            </CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
            <div v-if="dayStore.currentDay" class="flex flex-col gap-1">
                <p class="text-sm text-muted-foreground">
                    {{ dayDate }}
                </p>
                <p v-if="dayStore.isOpen" class="text-sm text-muted-foreground">
                    Ouvert à {{ formatTime(dayStore.currentDay.started_at) }}
                </p>
                <p
                    v-else-if="dayStore.currentDay.closed_at"
                    class="text-sm text-muted-foreground"
                >
                    Fermé à {{ formatTime(dayStore.currentDay.closed_at) }}
                </p>
                <div
                    v-if="dayStore.currentDay"
                    class="mt-1 flex gap-4 text-sm text-muted-foreground"
                >
                    <span>{{ dayStore.activeTickets.length }} tickets</span>
                    <span>CHF {{ dayStore.cashTotal.toFixed(2) }}</span>
                </div>
            </div>
            <div class="flex gap-2">
                <Button
                    v-if="!dayStore.currentDay && canOpenDay"
                    size="lg"
                    :disabled="loading"
                    @click="emit('open')"
                >
                    Ouvrir la journée
                </Button>
                <Button
                    v-if="dayStore.isOpen && canCloseDay"
                    size="lg"
                    variant="destructive"
                    :disabled="loading"
                    @click="emit('close')"
                >
                    Fermer
                </Button>
                <Button
                    v-if="
                        dayStore.currentDay && !dayStore.isOpen && canReopenDay
                    "
                    size="lg"
                    variant="outline"
                    :disabled="loading"
                    @click="emit('reopen')"
                >
                    Rouvrir
                </Button>
            </div>
        </CardContent>
    </Card>
</template>
