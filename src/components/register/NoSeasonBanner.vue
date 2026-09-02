<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'
import { useSeasonStore } from '@/stores/season'

const seasonStore = useSeasonStore()
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-background p-4"
  >
    <div
      class="flex max-w-md flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center"
    >
      <AlertTriangle class="size-12 text-destructive" />
      <h1 class="text-xl font-semibold text-destructive">Erreur</h1>
      <p class="text-muted-foreground">{{ seasonStore.error }}</p>
    </div>
  </div>
</template>
