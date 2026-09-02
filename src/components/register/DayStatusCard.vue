<script setup lang="ts">
import { useOperatingDayStore } from '@/stores/operating-day'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  open: []
  close: []
  reopen: []
}>()

const dayStore = useOperatingDayStore()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <span
          v-if="dayStore.isOpen"
          class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
        >
          OUVERT
        </span>
        <span
          v-else
          class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
        >
          FERMÉ
        </span>
      </CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <div v-if="dayStore.currentDay" class="flex flex-col gap-1">
        <p class="text-sm text-muted-foreground">
          {{ dayStore.currentDay.date }}
        </p>
        <p v-if="dayStore.isOpen" class="text-sm text-muted-foreground">
          Ouvert à {{ dayStore.currentDay.started_at }}
        </p>
        <p v-else-if="dayStore.currentDay.closed_at" class="text-sm text-muted-foreground">
          Fermé à {{ dayStore.currentDay.closed_at }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          v-if="!dayStore.isOpen"
          size="lg"
          :disabled="loading"
          @click="emit('open')"
        >
          Ouvrir
        </Button>
        <Button
          v-if="dayStore.isOpen"
          size="lg"
          variant="destructive"
          :disabled="loading"
          @click="emit('close')"
        >
          Fermer
        </Button>
        <Button
          v-if="dayStore.currentDay && !dayStore.isOpen"
          size="lg"
          variant="outline"
          :disabled="loading"
          @click="emit('reopen')"
        >
          Rouvrir
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
