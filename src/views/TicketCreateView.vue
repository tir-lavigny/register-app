<script setup lang="ts">
import { ArrowLeft, ShoppingCart } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { Product } from '@/api/model'
import ProductGrid from '@/components/register/ProductGrid.vue'
import QuantityDialog from '@/components/register/QuantityDialog.vue'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import AppLayout from '@/layouts/AppLayout.vue'
import { Permissions, hasPermission } from '@/lib/permissions'
import { useOperatingDayStore } from '@/stores/operating-day'
import type { TicketDraft } from '@/stores/ticket'
import { useTicketStore } from '@/stores/ticket'

const router = useRouter()
const dayStore = useOperatingDayStore()
const ticketStore = useTicketStore()

const showQuantityDialog = ref(false)
const selectedProduct = ref<Product | null>(null)
const showRestoreDialog = ref(false)
const hasRestoredDraft = ref(false)
const savedDraft = ref<TicketDraft | null>(null)

const items = computed(() => ticketStore.draft?.items ?? [])
const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0)
)
const draftTotal = computed(() =>
    items.value.reduce((sum, i) => sum + i.lineTotal, 0)
)

const savedDraftSummary = computed(() => {
    if (!savedDraft.value) return ''
    const items = savedDraft.value.items
    const total = items.reduce((sum, i) => sum + i.lineTotal, 0)
    const names = items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')
    return `${items.length} article${items.length > 1 ? 's' : ''} — ${names} — Total: ${total.toFixed(2)} CHF`
})

onMounted(async () => {
    if (!dayStore.currentDay) {
        await dayStore.fetchCurrentDay()
    }
    if (!dayStore.isOpen || !dayStore.dayId) {
        router.replace('/register')
        return
    }
    if (!hasPermission(Permissions.CREATE_TICKET)) {
        router.replace('/register')
        return
    }

    if (ticketStore.hasDraftInStorage(dayStore.dayId) && !ticketStore.draft) {
        savedDraft.value = ticketStore.loadDraftFromStorage(dayStore.dayId)
        if (!savedDraft.value || savedDraft.value.items.length === 0) {
            ticketStore.clearDraftStorage(dayStore.dayId)
            ticketStore.startDraft(dayStore.dayId)
            savedDraft.value = null
        } else {
            showRestoreDialog.value = true
        }
    } else if (!ticketStore.draft) {
        ticketStore.startDraft(dayStore.dayId)
    }
})

function handleRestoreDraft() {
    if (!dayStore.dayId || !savedDraft.value) return
    ticketStore.draft = savedDraft.value
    hasRestoredDraft.value = true
    toast.success('Ticket précédent restauré.')
    showRestoreDialog.value = false
    savedDraft.value = null
}

function handleDiscardDraft() {
    if (!dayStore.dayId) return
    ticketStore.clearDraftStorage(dayStore.dayId)
    ticketStore.startDraft(dayStore.dayId)
    showRestoreDialog.value = false
    savedDraft.value = null
}

function handleSelectProduct(product: Product) {
    selectedProduct.value = product
    showQuantityDialog.value = true
}

function handleQuantityConfirm(payload: {
    quantity: number
    customPrice: number | null
}) {
    if (!selectedProduct.value || !dayStore.dayId) return
    ticketStore.addItem(
        selectedProduct.value,
        payload.quantity,
        payload.customPrice,
        null,
        dayStore.dayId
    )
    toast.success(`${selectedProduct.value.name} ajouté`)
    selectedProduct.value = null
}

function goToSummary() {
    router.push('/register/ticket/summary')
}
</script>

<template>
    <AppLayout>
        <AlertDialog v-model:open="showRestoreDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Ticket en cours</AlertDialogTitle>
                    <AlertDialogDescription>
                        Vous avez un ticket non terminé. Voulez-vous le
                        reprendre ?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div
                    v-if="savedDraftSummary"
                    class="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground"
                >
                    {{ savedDraftSummary }}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        @click="handleDiscardDraft"
                    >
                        Nouveau ticket
                    </AlertDialogCancel>
                    <AlertDialogAction @click="handleRestoreDraft">
                        Reprendre
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div class="flex flex-1 flex-col gap-4 p-4">
            <div class="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    @click="router.push('/register')"
                >
                    <ArrowLeft class="size-5" />
                </Button>
                <h1 class="flex-1 text-xl font-bold">Nouveau ticket</h1>
            </div>

            <ProductGrid @select-product="handleSelectProduct" />

            <QuantityDialog
                v-model:open="showQuantityDialog"
                :product="selectedProduct"
                @confirm="handleQuantityConfirm"
            />

            <Button
                v-if="itemCount > 0"
                size="lg"
                class="fixed bottom-6 left-1/2 z-50 min-h-14 -translate-x-1/2 rounded-full px-6 shadow-lg"
                @click="goToSummary"
            >
                <ShoppingCart class="mr-2 size-5" />
                {{ itemCount }} article{{ itemCount > 1 ? 's' : '' }} —
                {{ draftTotal.toFixed(2) }} CHF
            </Button>
        </div>
    </AppLayout>
</template>
