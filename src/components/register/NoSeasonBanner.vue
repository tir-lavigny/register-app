<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'

import { useSeasonStore } from '@/stores/season'

const seasonStore = useSeasonStore()
</script>

<template>
    <div
        class="bg-background flex min-h-screen items-center justify-center p-4"
    >
        <div
            class="border-destructive/20 bg-destructive/5 flex max-w-md flex-col items-center gap-4 rounded-lg border p-8 text-center"
        >
            <AlertTriangle class="text-destructive size-12" />
            <h1 class="text-destructive text-xl font-semibold">Erreur</h1>
            <p class="text-muted-foreground">{{ seasonStore.error }}</p>
        </div>
    </div>
</template>
