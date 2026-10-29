<script setup lang="ts">
import { ArrowLeft, Check } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import type { ProductResource } from '@/api/model'
import PaymentSelector from '@/components/register/PaymentSelector.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/layouts/AppLayout.vue'
import { useOperatingDayStore } from '@/stores/operating-day'
import { computeItemSaved, useTicketStore } from '@/stores/ticket'

const router = useRouter()
const dayStore = useOperatingDayStore()
const ticketStore = useTicketStore()

const items = computed(() => ticketStore.draft?.items ?? [])
const total = computed(() => ticketStore.preview?.total ?? 0)
const paymentMethod = computed(() => ticketStore.draft?.paymentMethod ?? null)
const canFinalize = computed(() => ticketStore.canFinalize)

const itemsWithDiscounts = computed(() =>
    items.value.filter((i) => i.appliedVouchers.length > 0)
)
const totalDiscount = computed(() =>
    itemsWithDiscounts.value.reduce((sum, i) => sum + computeItemSaved(i), 0)
)

const finalizedItems = ref<
    {
        productId: number
        productName: string
        quantity: number
        product?: ProductResource
    }[]
>([])
const showHandoff = ref(false)

onMounted(async () => {
    if (!dayStore.currentDay) {
        await dayStore.fetchCurrentDay()
    }
    if (!dayStore.isOpen || !dayStore.dayId) {
        router.replace('/register')
        return
    }
    if (!ticketStore.draft || ticketStore.draft.items.length === 0) {
        router.replace('/register/ticket/new')
        return
    }
    ticketStore.fetchPreview(dayStore.dayId)
})

async function handleFinalize() {
    if (!dayStore.dayId) return
    const result = await ticketStore.finalizeTicket(dayStore.dayId)
    if (result.success) {
        finalizedItems.value = result.items
        showHandoff.value = true
    } else {
        toast.error(result.error)
    }
}

function handleHandoffDone() {
    showHandoff.value = false
    toast.success('Ticket créé avec succès!')
    ticketStore.startDraft(dayStore.dayId!)
    router.push('/register')
}
</script>

<template>
    <AppLayout>
        <div class="flex flex-1 flex-col gap-4 p-4">
            <div v-if="!showHandoff" class="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    @click="router.push('/register/ticket/summary')"
                >
                    <ArrowLeft class="size-5" />
                </Button>
                <h1 class="flex-1 text-xl font-bold">Paiement</h1>
            </div>

            <div
                v-if="!showHandoff"
                class="flex flex-1 flex-col items-center justify-center gap-6"
            >
                <Card class="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle class="text-center text-3xl font-bold">
                            {{ total.toFixed(2) }} CHF
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="flex flex-col gap-4">
                        <div
                            v-for="item in itemsWithDiscounts"
                            :key="item.productId"
                            class="flex items-center justify-between text-sm"
                        >
                            <span class="text-green-600">
                                {{ item.productName }} (bon)
                            </span>
                            <span class="font-medium text-green-600">
                                -{{ computeItemSaved(item).toFixed(2) }}
                                CHF
                            </span>
                        </div>
                        <div
                            v-if="totalDiscount > 0"
                            class="flex items-center justify-between border-t pt-3 text-sm"
                        >
                            <span class="text-green-600">Réductions</span>
                            <span class="font-bold text-green-600">
                                -{{ totalDiscount.toFixed(2) }} CHF
                            </span>
                        </div>

                        <div class="border-t pt-4">
                            <PaymentSelector
                                :model-value="paymentMethod"
                                @update:model-value="
                                    (v) =>
                                        v &&
                                        ticketStore.setPaymentMethod(
                                            v,
                                            dayStore.dayId ?? undefined
                                        )
                                "
                            />
                        </div>

                        <Button
                            size="lg"
                            class="min-h-14 w-full text-base font-bold"
                            :disabled="!canFinalize"
                            @click="handleFinalize"
                        >
                            <Check class="mr-2 size-5" />
                            Valider, {{ total.toFixed(2) }} CHF
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div
                v-else
                class="flex flex-1 flex-col items-center justify-center gap-6"
            >
                <Card class="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle class="text-center text-xl font-bold">
                            Articles à remettre
                        </CardTitle>
                    </CardHeader>
                    <CardContent class="flex flex-col gap-3">
                        <template
                            v-for="item in finalizedItems"
                            :key="item.productId"
                        >
                            <div
                                v-if="item.product?.child_products?.length"
                                class="flex flex-col gap-1"
                            >
                                <span
                                    class="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                                >
                                    {{ item.productName }}
                                </span>
                                <div
                                    v-for="child in item.product.child_products"
                                    :key="child.id"
                                    class="flex items-center justify-between rounded-md border px-3 py-2"
                                >
                                    <span class="text-sm font-medium">
                                        {{ child.name }}
                                    </span>
                                    <span class="text-sm font-bold">
                                        {{
                                            Number(child.quantity) *
                                            item.quantity
                                        }}
                                    </span>
                                </div>
                            </div>
                            <div
                                v-else
                                class="flex items-center justify-between rounded-md border px-3 py-2"
                            >
                                <span class="text-sm font-medium">
                                    {{ item.productName }}
                                </span>
                                <span class="text-sm font-bold">
                                    {{ item.quantity }}
                                </span>
                            </div>
                        </template>

                        <Button
                            size="lg"
                            class="mt-2 min-h-14 w-full text-base font-bold"
                            @click="handleHandoffDone"
                        >
                            <Check class="mr-2 size-5" />
                            Terminé
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    </AppLayout>
</template>
