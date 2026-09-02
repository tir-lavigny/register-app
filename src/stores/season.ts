import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { registerSeasonsCurrent } from '@/api/generated/season/season'
import type { SeasonResource } from '@/api/model'

export const useSeasonStore = defineStore('season', () => {
    const currentSeason = ref<SeasonResource | null>(null)
    const error = ref<string | null>(null)
    const loading = ref(false)

    const seasonId = computed(() => currentSeason.value?.id ?? null)

    async function fetchCurrentSeason() {
        loading.value = true
        error.value = null

        try {
            const response = await registerSeasonsCurrent()

            if (response.status === 200) {
                currentSeason.value = response.data.data
                return
            }

            if (response.status === 404) {
                error.value =
                    'Aucune saison active. Veuillez demander à un administrateur d\'en créer une.'
                currentSeason.value = null
                return
            }

            error.value = 'Une erreur inattendue est survenue.'
        } catch {
            error.value = 'Une erreur inattendue est survenue.'
        } finally {
            loading.value = false
        }
    }

    return {
        currentSeason,
        error,
        loading,
        seasonId,
        fetchCurrentSeason,
    }
})
