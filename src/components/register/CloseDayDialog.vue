<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Permissions, hasPermission } from '@/lib/permissions'
import { useOperatingDayStore } from '@/stores/operating-day'

const props = defineProps<{
    open: boolean
    cashTotal: number
    twintTotal: number
    ticketCount: number
    initialRemark?: string
    closingBalance?: string | null
    targetDayId?: number
    targetDayDate?: string
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
}>()

const dayStore = useOperatingDayStore()
const remark = ref('')
const submitting = ref(false)

const canAddRemark = computed(() => hasPermission(Permissions.ADD_CASH_REMARK))

const parsedClosingBalance = computed(() => {
    if (!props.closingBalance) return null
    const value = Number.parseFloat(props.closingBalance)
    return isNaN(value) ? null : value
})

watch(
    () => props.open,
    (val) => {
        if (val) {
            remark.value = props.initialRemark ?? ''
        }
    }
)

function formatDate(iso: string): string {
    const date = new Date(iso)
    return new Intl.DateTimeFormat('fr-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date)
}

async function handleConfirm() {
    submitting.value = true
    const result = await dayStore.closeDay(
        props.targetDayId,
        canAddRemark.value ? remark.value || undefined : undefined
    )
    submitting.value = false

    if (result.success) {
        emit('update:open', false)
    }
}
</script>

<template>
    <Dialog :open="props.open" @update:open="emit('update:open', $event)">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Fermer la journée</DialogTitle>
                <DialogDescription>
                    <template v-if="targetDayDate">
                        Fermer la journée du
                        <strong>{{ formatDate(targetDayDate) }}</strong>
                    </template>
                    <template v-else> Résumé de la journée </template>
                </DialogDescription>
            </DialogHeader>
            <div class="flex flex-col gap-3">
                <div
                    v-if="parsedClosingBalance !== null"
                    class="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                >
                    <span class="text-sm font-medium"
                        >Solde de fermeture attendu</span
                    >
                    <span class="text-lg font-bold"
                        >CHF {{ parsedClosingBalance.toFixed(2) }}</span
                    >
                </div>
                <div class="h-px bg-border" />
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Tickets</span>
                    <span class="font-medium">{{ props.ticketCount }}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Espèces</span>
                    <span class="font-medium"
                        >CHF {{ props.cashTotal.toFixed(2) }}</span
                    >
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Twint</span>
                    <span class="font-medium"
                        >CHF {{ props.twintTotal.toFixed(2) }}</span
                    >
                </div>
                <div v-if="canAddRemark" class="mt-2 flex flex-col gap-1.5">
                    <label for="cash-remark" class="text-sm font-medium"
                        >Remarque</label
                    >
                    <textarea
                        id="cash-remark"
                        v-model="remark"
                        rows="3"
                        class="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Ex: différence de caisse..."
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose as-child>
                    <Button variant="outline" :disabled="submitting"
                        >Annuler</Button
                    >
                </DialogClose>
                <Button
                    variant="destructive"
                    :disabled="submitting"
                    @click="handleConfirm"
                >
                    {{ submitting ? 'Fermeture...' : 'Fermer' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
