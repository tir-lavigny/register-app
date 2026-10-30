<script setup lang="ts">
import { ref } from 'vue'

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
import { useOperatingDayStore } from '@/stores/operating-day'
import { useSeasonStore } from '@/stores/season'

const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    confirm: []
}>()

const dayStore = useOperatingDayStore()
const seasonStore = useSeasonStore()
const submitting = ref(false)
const error = ref<string | null>(null)

function formatDate(iso: string): string {
    const date = new Date(iso)
    return new Intl.DateTimeFormat('fr-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date)
}

async function handleConfirm() {
    if (!seasonStore.seasonId) return

    submitting.value = true
    const result = await dayStore.createDay(seasonStore.seasonId)
    submitting.value = false

    if (result.success) {
        emit('confirm')
        emit('update:open', false)
    } else {
        error.value = result.error
    }
}
</script>

<template>
    <Dialog :open="props.open" @update:open="emit('update:open', $event)">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ouvrir la journée</DialogTitle>
                <DialogDescription>
                    Ouvrir une nouvelle journée?
                </DialogDescription>
            </DialogHeader>
            <template v-if="error">
                <p class="text-destructive text-sm">{{ error }}</p>
                <p
                    v-if="dayStore.previousUnclosedDay"
                    class="text-muted-foreground text-sm"
                >
                    Journée du
                    <strong>{{
                        formatDate(dayStore.previousUnclosedDay.date)
                    }}</strong>
                </p>
            </template>
            <DialogFooter>
                <DialogClose as-child>
                    <Button variant="outline" :disabled="submitting"
                        >Annuler</Button
                    >
                </DialogClose>
                <Button :disabled="submitting" @click="handleConfirm">
                    {{ submitting ? 'Ouverture...' : 'Ouvrir' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
