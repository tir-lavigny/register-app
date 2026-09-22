<script setup lang="ts">
import { ArrowLeft, PackageX } from '@lucide/vue'
import { computed, onMounted, toRef } from 'vue'
import { useRouter } from 'vue-router'

import { useStockLossesIndex } from '@/api/generated/stock-loss/stock-loss'
import type { StockMovementResource } from '@/api/model'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/layouts/AppLayout.vue'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useStockLocationStore } from '@/stores/stock-location'

const router = useRouter()
const dayStore = useOperatingDayStore()
const stockLocationStore = useStockLocationStore()

const dayId = toRef(computed(() => dayStore.dayId ?? 0))
const locationId = toRef(
    computed(() => stockLocationStore.activeLocationId ?? 0)
)

const { data, isLoading } = useStockLossesIndex(locationId, dayId)

const losses = computed(() => {
    const response = data.value
    if (!response || response.status !== 200) return []
    const payload = response.data
    if (!('data' in payload)) return []
    return payload.data as (StockMovementResource & {
        product: NonNullable<StockMovementResource['product']>
        stockLocation: NonNullable<StockMovementResource['stockLocation']>
    })[]
})

const totalQuantity = computed(() =>
    losses.value.reduce((sum, item) => sum + item.quantity, 0)
)

function formatDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('fr-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

onMounted(async () => {
    if (!dayStore.currentDay) {
        await dayStore.fetchCurrentDay()
    }
    if (stockLocationStore.locations.length === 0) {
        await stockLocationStore.fetchLocations()
    }
})
</script>

<template>
    <AppLayout>
        <div class="flex flex-1 flex-col gap-4 p-4">
            <div class="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    @click="router.push('/register')"
                >
                    <ArrowLeft class="size-5" />
                </Button>
                <h1 class="flex-1 text-xl font-bold">Pertes de stock</h1>
            </div>

            <Card v-if="losses.length > 0">
                <CardHeader>
                    <CardTitle>Résumé</CardTitle>
                </CardHeader>
                <CardContent class="flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-muted-foreground"
                            >Produits perdus</span
                        >
                        <span class="font-medium">{{ losses.length }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-muted-foreground"
                            >Quantité totale</span
                        >
                        <span class="font-medium">{{ totalQuantity }}</span>
                    </div>
                </CardContent>
            </Card>

            <div
                v-if="isLoading"
                class="py-12 text-center text-sm text-muted-foreground"
            >
                Chargement…
            </div>

            <div
                v-else-if="losses.length === 0"
                class="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground"
            >
                <PackageX class="size-10" />
                <span>Aucune perte de stock pour cette journée</span>
            </div>

            <div v-else class="flex flex-col gap-2">
                <div
                    v-for="loss in losses"
                    :key="loss.id"
                    class="flex items-center gap-3 rounded-lg border px-4 py-3"
                >
                    <div class="min-w-0 flex-1">
                        <span class="block text-sm font-medium">{{
                            loss.product.name
                        }}</span>
                        <span class="text-xs text-muted-foreground">
                            {{ loss.stockLocation.name }}
                        </span>
                    </div>
                    <span class="text-xs text-muted-foreground">{{
                        formatDate(loss.created_at)
                    }}</span>
                    <span class="min-w-12 text-right text-sm font-medium">
                        {{ loss.quantity }}
                    </span>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
