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

async function handleConfirm() {
    if (!seasonStore.seasonId) return

    submitting.value = true
    const result = await dayStore.createDay(seasonStore.seasonId)
    submitting.value = false

    if (result.success) {
        emit('confirm')
        emit('update:open', false)
    } else {
        const apiError = result.error || 'Une erreur est survenue'
        error.value =
            apiError ===
            'An operating day with this date already exists for this season.'
                ? "Une journée non cloturée existe déjà pour cette saison. Veuillez la cloturer avant d'en ouvrir une nouvelle."
                : apiError
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
                <p class="text-sm text-destructive">{{ error }}</p>
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
