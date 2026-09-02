<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ShoppingCart } from '@lucide/vue'
import { toast } from 'vue-sonner'

import type { Product } from '@/api/model'
import { Button } from '@/components/ui/button'
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
import ProductGrid from '@/components/register/ProductGrid.vue'
import QuantityDialog from '@/components/register/QuantityDialog.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useTicketStore } from '@/stores/ticket'

const router = useRouter()
const dayStore = useOperatingDayStore()
const ticketStore = useTicketStore()

const showQuantityDialog = ref(false)
const selectedProduct = ref<Product | null>(null)
const showRestoreDialog = ref(false)
const hasRestoredDraft = ref(false)

const items = computed(() => ticketStore.draft?.items ?? [])
const itemCount = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))
const draftTotal = computed(() => items.value.reduce((sum, i) => sum + i.lineTotal, 0))

onMounted(async () => {
    if (!dayStore.currentDay) {
        await dayStore.fetchCurrentDay()
    }
    if (!dayStore.isOpen || !dayStore.dayId) {
        router.replace('/register')
        return
    }

    if (ticketStore.hasDraftInStorage(dayStore.dayId) && !ticketStore.draft) {
        showRestoreDialog.value = true
    } else if (!ticketStore.draft) {
        ticketStore.startDraft(dayStore.dayId)
    }
})

function handleRestoreDraft() {
    if (!dayStore.dayId) return
    const saved = ticketStore.loadDraftFromStorage(dayStore.dayId)
    if (saved) {
        ticketStore.draft = saved
        hasRestoredDraft.value = true
        toast.success('Ticket précédent restauré.')
    }
    showRestoreDialog.value = false
}

function handleDiscardDraft() {
    if (!dayStore.dayId) return
    ticketStore.clearDraftStorage(dayStore.dayId)
    ticketStore.startDraft(dayStore.dayId)
    showRestoreDialog.value = false
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
                        Vous avez un ticket non terminé. Voulez-vous le reprendre ?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="handleDiscardDraft">
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
                <Button variant="ghost" size="icon" @click="router.push('/register')">
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
                {{ itemCount }} article{{ itemCount > 1 ? 's' : '' }} — {{ draftTotal.toFixed(2) }} CHF
            </Button>
        </div>
    </AppLayout>
</template>
