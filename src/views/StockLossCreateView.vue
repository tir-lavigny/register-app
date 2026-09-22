<script setup lang="ts">
import { ArrowLeft, Delete } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { stockLossesStore } from '@/api/generated/stock-loss/stock-loss'
import type { ProductResource } from '@/api/model'
import ProductGrid from '@/components/register/ProductGrid.vue'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import AppLayout from '@/layouts/AppLayout.vue'
import { Permissions, hasPermission } from '@/lib/permissions'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useStockLocationStore } from '@/stores/stock-location'

const router = useRouter()
const dayStore = useOperatingDayStore()
const stockLocationStore = useStockLocationStore()

const selectedProduct = ref<ProductResource | null>(null)
const showDialog = ref(false)
const quantity = ref(1)
const reason = ref('')
const submitting = ref(false)
const hasTypedQuantity = ref(false)

onMounted(async () => {
    if (!dayStore.currentDay) {
        await dayStore.fetchCurrentDay()
    }
    if (!dayStore.isOpen || !hasPermission(Permissions.RECORD_STOCK_LOSS)) {
        router.replace('/register/stock-losses')
        return
    }
    if (stockLocationStore.locations.length === 0) {
        await stockLocationStore.fetchLocations()
    }
})

function handleSelectProduct(product: ProductResource) {
    selectedProduct.value = product
    quantity.value = 1
    reason.value = ''
    hasTypedQuantity.value = false
    showDialog.value = true
}

function handleNumpad(digit: string) {
    if (!hasTypedQuantity.value) {
        quantity.value = Number(digit)
        hasTypedQuantity.value = true
    } else {
        quantity.value = Number(quantity.value.toString() + digit)
    }
}

function handleBackspace() {
    const str = quantity.value.toString()
    if (str.length <= 1) {
        quantity.value = 1
        hasTypedQuantity.value = false
    } else {
        quantity.value = Number(str.slice(0, -1))
    }
}

async function handleSubmit() {
    if (
        !selectedProduct.value ||
        !dayStore.dayId ||
        !stockLocationStore.activeLocationId
    )
        return
    if (quantity.value < 1 || !reason.value.trim()) return

    submitting.value = true
    try {
        const response = await stockLossesStore({
            stock_location_id: stockLocationStore.activeLocationId,
            operating_day_id: dayStore.dayId,
            product_id: selectedProduct.value.id,
            quantity: quantity.value,
            reason: reason.value.trim(),
        })

        if (response.status === 201) {
            toast.success('Perte de stock enregistrée')
            showDialog.value = false
            selectedProduct.value = null
            router.push('/register/stock-losses')
            return
        }

        if (response.status === 422) {
            const errors = response.data.errors
            const msg = errors
                ? Object.values(errors).flat().join(', ')
                : response.data.message
            toast.error(msg || 'Données invalides')
            return
        }

        if (response.status === 403) {
            toast.error("Vous n'avez pas les droits nécessaires")
            return
        }

        toast.error("Erreur lors de l'enregistrement")
    } catch {
        toast.error("Erreur lors de l'enregistrement")
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <AppLayout>
        <div class="flex flex-1 flex-col gap-4 p-4">
            <div class="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    @click="router.push('/register/stock-losses')"
                >
                    <ArrowLeft class="size-5" />
                </Button>
                <h1 class="flex-1 text-xl font-bold">
                    Nouvelle perte de stock
                </h1>
            </div>

            <p class="text-sm text-muted-foreground">
                Sélectionnez un produit à déclarer en perte.
            </p>

            <ProductGrid
                :filter-product="
                    (p) =>
                        (p as unknown as Record<string, unknown>)
                            .is_stockable === true
                "
                @select-product="handleSelectProduct"
            />
        </div>

        <Dialog :open="showDialog" @update:open="showDialog = $event">
            <DialogContent class="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{{ selectedProduct?.name }}</DialogTitle>
                </DialogHeader>

                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium text-foreground"
                            >Quantité</label
                        >
                        <Input
                            :model-value="String(quantity)"
                            readonly
                            class="text-center text-lg font-bold"
                        />
                        <div class="grid grid-cols-3 gap-1">
                            <Button
                                v-for="digit in [
                                    '1',
                                    '2',
                                    '3',
                                    '4',
                                    '5',
                                    '6',
                                    '7',
                                    '8',
                                    '9',
                                ]"
                                :key="digit"
                                variant="outline"
                                class="min-h-11 text-lg font-bold"
                                @click="handleNumpad(digit)"
                            >
                                {{ digit }}
                            </Button>
                            <Button
                                variant="outline"
                                class="min-h-11 text-lg font-bold"
                                @click="handleNumpad('0')"
                            >
                                0
                            </Button>
                            <Button
                                variant="outline"
                                class="min-h-11 text-lg font-bold"
                                @click="handleBackspace"
                            >
                                <Delete class="size-4" />
                            </Button>
                            <div></div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Raison</label>
                        <textarea
                            v-model="reason"
                            rows="3"
                            class="rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Ex: produit cassé, périmé..."
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        :disabled="submitting"
                        @click="showDialog = false"
                    >
                        Annuler
                    </Button>
                    <Button
                        :disabled="quantity < 1 || !reason.trim() || submitting"
                        @click="handleSubmit"
                    >
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </AppLayout>
</template>
