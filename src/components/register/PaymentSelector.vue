<script setup lang="ts">
import { Button } from '@/components/ui/button'

defineProps<{
    modelValue: 'cash' | 'twint' | null
}>()

const emit = defineEmits<{
    'update:modelValue': [value: 'cash' | 'twint' | null]
}>()
</script>

<template>
    <div class="flex gap-2">
        <Button
            :variant="modelValue === 'cash' ? 'default' : 'outline'"
            class="min-h-12 flex-1 text-base font-medium"
            @click="emit('update:modelValue', 'cash')"
        >
            Espèces
        </Button>
        <Button
            :variant="modelValue === 'twint' ? 'default' : 'outline'"
            class="min-h-12 flex-1 text-base font-medium"
            @click="emit('update:modelValue', 'twint')"
        >
            Twint
        </Button>
    </div>
</template>
