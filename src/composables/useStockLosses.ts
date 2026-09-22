import { computed, onMounted, toRef } from 'vue'

import { useStockLossesIndex } from '@/api/generated/stock-loss/stock-loss'
import type { StockMovementResource } from '@/api/model'
import { Permissions, hasPermission } from '@/lib/permissions'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useStockLocationStore } from '@/stores/stock-location'

export type StockLoss = StockMovementResource & {
    product: NonNullable<StockMovementResource['product']>
    stockLocation: NonNullable<StockMovementResource['stockLocation']>
}

export function useStockLosses() {
    const dayStore = useOperatingDayStore()
    const stockLocationStore = useStockLocationStore()

    const canRecordLoss = computed(
        () => hasPermission(Permissions.RECORD_STOCK_LOSS) && dayStore.isOpen
    )

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
        return payload.data as StockLoss[]
    })

    const totalQuantity = computed(() =>
        losses.value.reduce((sum, item) => sum + item.quantity, 0)
    )

    async function ensureLoaded() {
        if (!dayStore.currentDay) {
            await dayStore.fetchCurrentDay()
        }
        if (stockLocationStore.locations.length === 0) {
            await stockLocationStore.fetchLocations()
        }
    }

    onMounted(ensureLoaded)

    return {
        losses,
        totalQuantity,
        isLoading,
        canRecordLoss,
    }
}
