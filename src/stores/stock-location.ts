import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { stockLocationsIndex } from '@/api/generated/stock-location/stock-location'
import type { StockLocationResource } from '@/api/model'

const STORAGE_KEY = 'register_stock_location_id'

export const useStockLocationStore = defineStore('stockLocation', () => {
    const locations = ref<StockLocationResource[]>([])
    const activeLocationId = ref<number | null>(null)
    const loading = ref(false)

    const activeLocation = computed(
        () =>
            locations.value.find((l) => l.id === activeLocationId.value) ?? null
    )

    function loadFromStorage() {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const id = Number.parseInt(raw, 10)
            if (!Number.isNaN(id)) {
                activeLocationId.value = id
            }
        }
    }

    function saveToStorage(id: number) {
        localStorage.setItem(STORAGE_KEY, String(id))
    }

    function setActiveLocation(id: number) {
        activeLocationId.value = id
        saveToStorage(id)
    }

    async function fetchLocations() {
        loading.value = true
        try {
            const response = await stockLocationsIndex()
            if (response.status === 200) {
                locations.value = response.data.data
                if (
                    activeLocationId.value === null &&
                    locations.value.length > 0
                ) {
                    const first = locations.value[0]!
                    activeLocationId.value = first.id
                    saveToStorage(first.id)
                }
            }
        } finally {
            loading.value = false
        }
    }

    return {
        locations,
        activeLocationId,
        activeLocation,
        loading,
        loadFromStorage,
        setActiveLocation,
        fetchLocations,
    }
})
