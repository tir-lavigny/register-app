<script setup lang="ts">
import { createReusableTemplate, useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'

import type { TicketResource } from '@/api/model'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'

import TicketDetailContent from './TicketDetailContent.vue'

const props = defineProps<{
    open: boolean
    ticket: TicketResource | null
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
    refunded: []
}>()

const isDesktop = useMediaQuery('(min-width: 768px)')

const [DefineContent, ReuseContent] = createReusableTemplate<{
    ticket: TicketResource
}>()

function formatTime(iso: string): string {
    const date = new Date(iso)
    return new Intl.DateTimeFormat('fr-CH', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

const title = computed(() =>
    props.ticket ? formatTime(props.ticket.sold_at) : 'Ticket'
)

function handleClose() {
    emit('update:open', false)
}

function handleRefunded() {
    emit('refunded')
}
</script>

<template>
    <DefineContent v-slot="{ ticket: slotTicket }">
        <TicketDetailContent :ticket="slotTicket" @refunded="handleRefunded" />
    </DefineContent>

    <Sheet v-if="isDesktop" :open="open" @update:open="handleClose">
        <SheetContent side="right">
            <SheetHeader>
                <SheetTitle>{{ title }}</SheetTitle>
            </SheetHeader>
            <div class="overflow-y-auto px-4 pb-4">
                <ReuseContent v-if="ticket" :ticket="ticket" />
            </div>
        </SheetContent>
    </Sheet>

    <Drawer v-else :open="open" @update:open="handleClose">
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>{{ title }}</DrawerTitle>
            </DrawerHeader>
            <div class="overflow-y-auto px-4 pb-4">
                <ReuseContent v-if="ticket" :ticket="ticket" />
            </div>
        </DrawerContent>
    </Drawer>
</template>
