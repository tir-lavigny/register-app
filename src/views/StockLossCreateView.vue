<script setup lang="ts">
import { ArrowLeft, Delete } from '@lucide/vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

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
import { useStockLossForm } from '@/composables/useStockLossForm'
import AppLayout from '@/layouts/AppLayout.vue'
import { Permissions, hasPermission } from '@/lib/permissions'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useStockLocationStore } from '@/stores/stock-location'

const router = useRouter()
const dayStore = useOperatingDayStore()
const stockLocationStore = useStockLocationStore()

const {
    selectedProduct,
    showDialog,
    quantity,
    reason,
    submitting,
    selectProduct,
    numpad,
    backspace,
    submit,
} = useStockLossForm()

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

            <p class="text-muted-foreground text-sm">
                Sélectionnez un produit à déclarer en perte.
            </p>

            <ProductGrid
                :filter-product="
                    (p) =>
                        (p as unknown as Record<string, unknown>)
                            .is_stockable === true
                "
                @select-product="selectProduct"
            />
        </div>

        <Dialog :open="showDialog" @update:open="showDialog = $event">
            <DialogContent class="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{{ selectedProduct?.name }}</DialogTitle>
                </DialogHeader>

                <div class="flex flex-col gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-foreground text-sm font-medium"
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
                                @click="numpad(digit)"
                            >
                                {{ digit }}
                            </Button>
                            <Button
                                variant="outline"
                                class="min-h-11 text-lg font-bold"
                                @click="numpad('0')"
                            >
                                0
                            </Button>
                            <Button
                                variant="outline"
                                class="min-h-11 text-lg font-bold"
                                @click="backspace"
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
                            class="bg-background placeholder:text-muted-foreground focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
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
                        @click="submit"
                    >
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </AppLayout>
</template>
