<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
    ticketCount: number
    cashTotal: number
    twintTotal: number
}>()
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm">Tickets</span>
                <span class="font-medium">{{ ticketCount }}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm">Espèces</span>
                <span class="font-medium">CHF {{ cashTotal.toFixed(2) }}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-sm">Twint</span>
                <span class="font-medium">CHF {{ twintTotal.toFixed(2) }}</span>
            </div>
        </CardContent>
    </Card>
</template>
