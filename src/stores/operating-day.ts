import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
    registerOperatingDaysCurrent,
    registerOperatingDaysShow,
    registerOperatingDaysStore,
    registerOperatingDaysUpdate,
} from '@/api/generated/operating-day/operating-day'
import type { OperatingDayResource, UpdateDayRequestStatus } from '@/api/model'

export const useOperatingDayStore = defineStore('operatingDay', () => {
    const currentDay = ref<OperatingDayResource | null>(null)
    const loading = ref(false)

    const isOpen = computed(
        () => currentDay.value !== null && currentDay.value.closed_at === null
    )
    const dayId = computed(() => currentDay.value?.id ?? null)

    const activeTickets = computed(
        () => currentDay.value?.tickets?.filter((t) => !t.deleted_at) ?? []
    )
    const canceledTickets = computed(
        () => currentDay.value?.tickets?.filter((t) => t.deleted_at) ?? []
    )

    const cashTotal = computed(() =>
        activeTickets.value
            .filter((t) => t.payment_method === 'cash')
            .reduce((sum, t) => sum + Number.parseFloat(t.total), 0)
    )
    const twintTotal = computed(() =>
        activeTickets.value
            .filter((t) => t.payment_method === 'twint')
            .reduce((sum, t) => sum + Number.parseFloat(t.total), 0)
    )

    async function fetchCurrentDay() {
        loading.value = true
        try {
            const response = await registerOperatingDaysCurrent()
            if (response.status === 200) {
                currentDay.value = response.data.data
                return
            }
            if (response.status === 404) {
                currentDay.value = null
                return
            }
        } finally {
            loading.value = false
        }
    }

    async function createDay(
        seasonId: number
    ): Promise<
        | { success: true }
        | { success: false; error: string; errors?: Record<string, string[]> }
    > {
        if (isOpen.value) {
            return { success: false, error: 'Une journée est déjà ouverte.' }
        }

        loading.value = true
        try {
            const response = await registerOperatingDaysStore({
                season_id: seasonId,
            })

            if (response.status === 201) {
                currentDay.value = response.data.data
                return { success: true }
            }

            if (response.status === 422) {
                return {
                    success: false,
                    error: response.data.message,
                    errors: response.data.errors ?? undefined,
                }
            }

            return {
                success: false,
                error: 'Une erreur inattendue est survenue.',
            }
        } catch {
            return {
                success: false,
                error: 'Une erreur inattendue est survenue.',
            }
        } finally {
            loading.value = false
        }
    }

    async function closeDay(
        remark?: string
    ): Promise<
        | { success: true; data: OperatingDayResource }
        | { success: false; error: string }
    > {
        if (!isOpen.value || !dayId.value) {
            return { success: false, error: 'Aucune journée ouverte.' }
        }

        loading.value = true
        try {
            const response = await registerOperatingDaysUpdate(dayId.value, {
                status: 'closed' as UpdateDayRequestStatus,
                cash_remark: remark ?? null,
            })

            if (response.status === 200 && response.data.data) {
                const closedDay = response.data.data
                currentDay.value = null
                return { success: true, data: closedDay }
            }

            return {
                success: false,
                error: 'Une erreur inattendue est survenue.',
            }
        } catch {
            return {
                success: false,
                error: 'Une erreur inattendue est survenue.',
            }
        } finally {
            loading.value = false
        }
    }

    async function reopenDay(): Promise<
        { success: true } | { success: false; error: string }
    > {
        if (!dayId.value) {
            return { success: false, error: 'Aucune journée refermée.' }
        }

        loading.value = true
        try {
            const response = await registerOperatingDaysUpdate(dayId.value, {
                status: 'open' as UpdateDayRequestStatus,
            })

            if (response.status === 200 && response.data.data) {
                currentDay.value = response.data.data
                return { success: true }
            }

            return {
                success: false,
                error: 'Une erreur inattendue est survenue.',
            }
        } catch {
            return {
                success: false,
                error: 'Une erreur inattendue est survenue.',
            }
        } finally {
            loading.value = false
        }
    }

    async function refreshDay() {
        if (!dayId.value) return
        loading.value = true
        try {
            const response = await registerOperatingDaysShow(dayId.value)
            if (response.status === 200) {
                currentDay.value = response.data.data
            }
        } finally {
            loading.value = false
        }
    }

    return {
        currentDay,
        loading,
        isOpen,
        dayId,
        activeTickets,
        canceledTickets,
        cashTotal,
        twintTotal,
        fetchCurrentDay,
        createDay,
        closeDay,
        reopenDay,
        refreshDay,
    }
})
