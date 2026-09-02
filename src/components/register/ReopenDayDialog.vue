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

const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
}>()

const dayStore = useOperatingDayStore()
const submitting = ref(false)

async function handleConfirm() {
    submitting.value = true
    const result = await dayStore.reopenDay()
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
                <DialogTitle>Rouvrir la journée</DialogTitle>
                <DialogDescription> Rouvrir cette journée? </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose as-child>
                    <Button variant="outline" :disabled="submitting"
                        >Annuler</Button
                    >
                </DialogClose>
                <Button :disabled="submitting" @click="handleConfirm">
                    {{ submitting ? 'Réouverture...' : 'Rouvrir' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
