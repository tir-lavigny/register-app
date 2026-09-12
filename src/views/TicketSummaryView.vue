<script setup lang="ts">
import { ArrowLeft, Tag } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useRegisterMembersVouchers } from '@/api/generated/member/member'
import type { Voucher } from '@/api/model'
import MemberSelectDialog from '@/components/register/MemberSelectDialog.vue'
import TicketDraftItemRow from '@/components/register/TicketDraftItemRow.vue'
import VoucherSelectDialog from '@/components/register/VoucherSelectDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/layouts/AppLayout.vue'
import { extractData } from '@/lib/utils'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useTicketStore } from '@/stores/ticket'

const router = useRouter()
const dayStore = useOperatingDayStore()
const ticketStore = useTicketStore()

const showMemberDialog = ref(false)
const showVoucherDialog = ref(false)
const voucherTargetIndex = ref(-1)

const items = computed(() => ticketStore.draft?.items ?? [])
const total = computed(() => ticketStore.preview?.total ?? 0)
const memberId = computed(() => ticketStore.draft?.memberId ?? 0)
const memberName = computed(() => ticketStore.draft?.memberName)

const { data: vouchersData } = useRegisterMembersVouchers(memberId, {
    query: { enabled: computed(() => memberId.value > 0) },
})

const memberVouchers = computed(() => extractData<Voucher>(vouchersData.value))

const itemsWithVouchers = computed(() =>
    items.value.map((item, index) => ({
        ...item,
        index,
        availableVoucher: memberVouchers.value.find(
            (v) => v.product_id === item.productId
        ),
    }))
)

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

function handleUpdateQuantity(payload: { index: number; quantity: number }) {
    if (!dayStore.dayId) return
    ticketStore.updateItemQuantity(
        payload.index,
        payload.quantity,
        dayStore.dayId
    )
    ticketStore.fetchPreview(dayStore.dayId)
}

function handleRemove(index: number) {
    if (!dayStore.dayId) return
    ticketStore.removeItem(index, dayStore.dayId)
    ticketStore.fetchPreview(dayStore.dayId)
}

function handleApplyVoucher(index: number) {
    if (!ticketStore.draft?.memberId) {
        showMemberDialog.value = true
        return
    }
    voucherTargetIndex.value = index
    showVoucherDialog.value = true
}

function handleToggleVoucher(index: number) {
    if (!dayStore.dayId) return
    const item = items.value[index]
    if (!item) return

    if (item.voucherId) {
        ticketStore.clearVoucherForItem(index, dayStore.dayId)
    } else {
        const itemWithVoucher = itemsWithVouchers.value[index]
        if (itemWithVoucher?.availableVoucher) {
            ticketStore.applyVoucher(
                index,
                itemWithVoucher.availableVoucher,
                dayStore.dayId
            )
        }
    }
    ticketStore.fetchPreview(dayStore.dayId)
}

function handleMemberSelect(member: { id: number; name: string } | null) {
    if (!dayStore.dayId) return
    if (member) {
        ticketStore.setMember(member.id, member.name, dayStore.dayId)
    } else {
        ticketStore.setMember(null, null, dayStore.dayId)
    }
}

function handleVoucherSelect(voucher: Voucher | null) {
    if (!dayStore.dayId) return
    const index = voucherTargetIndex.value
    if (index < 0) return

    if (voucher) {
        ticketStore.applyVoucher(index, voucher, dayStore.dayId)
    } else {
        ticketStore.clearVoucherForItem(index, dayStore.dayId)
    }
    showVoucherDialog.value = false
    voucherTargetIndex.value = -1
    ticketStore.fetchPreview(dayStore.dayId)
}

function goToPayment() {
    router.push('/register/ticket/payment')
}
</script>

<template>
    <AppLayout>
        <div class="flex flex-1 flex-col gap-4 p-4">
            <div class="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    @click="router.push('/register/ticket/new')"
                >
                    <ArrowLeft class="size-5" />
                </Button>
                <h1 class="flex-1 text-xl font-bold">Récapitulatif</h1>
                <span class="text-lg font-bold">
                    {{ total.toFixed(2) }} CHF
                </span>
            </div>

            <div class="flex flex-1 flex-col gap-4 lg:flex-row">
                <div class="flex flex-1 flex-col gap-4 lg:w-1/2">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-lg">Articles</CardTitle>
                        </CardHeader>
                        <CardContent class="flex flex-col gap-2">
                            <div
                                v-if="items.length === 0"
                                class="py-8 text-center text-sm text-muted-foreground"
                            >
                                Aucun article
                            </div>
                            <template v-else>
                                <TicketDraftItemRow
                                    v-for="(item, index) in items"
                                    :key="item.productId"
                                    :item="item"
                                    :index="index"
                                    @update-quantity="handleUpdateQuantity"
                                    @remove="handleRemove"
                                    @apply-voucher="handleApplyVoucher"
                                />
                            </template>
                        </CardContent>
                    </Card>
                </div>

                <div class="flex flex-col gap-4 lg:w-1/2">
                    <Card v-if="memberId > 0">
                        <CardHeader>
                            <CardTitle class="text-lg">Bons</CardTitle>
                        </CardHeader>
                        <CardContent class="flex flex-col gap-2">
                            <div
                                v-if="memberVouchers.length === 0"
                                class="py-4 text-center text-sm text-muted-foreground"
                            >
                                Aucun bon disponible
                            </div>
                            <template v-else>
                                <div
                                    v-for="(item, index) in itemsWithVouchers"
                                    :key="item.productId"
                                >
                                    <button
                                        v-if="
                                            item.availableVoucher &&
                                            !item.voucherId
                                        "
                                        class="flex w-full items-center gap-2 rounded-lg border border-dashed border-green-300 bg-green-50 px-3 py-2 text-sm text-green-600 transition-colors hover:bg-green-100"
                                        @click="handleToggleVoucher(index)"
                                    >
                                        <Tag class="size-4" />
                                        Appliquer pour {{ item.productName }}
                                    </button>
                                    <button
                                        v-else-if="item.voucherId"
                                        class="flex w-full items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-600 transition-colors hover:bg-green-100"
                                        @click="handleToggleVoucher(index)"
                                    >
                                        <Tag class="size-4" />
                                        {{ item.productName }} — Bon appliqué
                                        (retirer)
                                    </button>
                                </div>
                            </template>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent class="flex flex-col gap-3 pt-6">
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-muted-foreground"
                                    >Total</span
                                >
                                <span class="text-lg font-bold"
                                    >{{ total.toFixed(2) }} CHF</span
                                >
                            </div>

                            <div
                                class="flex items-center justify-between border-t pt-3"
                            >
                                <span class="text-sm text-muted-foreground">
                                    Membre: {{ memberName ?? 'Aucun' }}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    @click="showMemberDialog = true"
                                >
                                    {{
                                        memberName ? 'Changer' : 'Sélectionner'
                                    }}
                                </Button>
                            </div>

                            <Button
                                size="lg"
                                class="min-h-14 w-full text-base font-bold"
                                :disabled="items.length === 0"
                                @click="goToPayment"
                            >
                                Continuer
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <MemberSelectDialog
                v-model:open="showMemberDialog"
                @select="handleMemberSelect"
            />

            <VoucherSelectDialog
                v-model:open="showVoucherDialog"
                :member-id="ticketStore.draft?.memberId ?? 0"
                :product-id="
                    voucherTargetIndex >= 0 &&
                    ticketStore.draft?.items[voucherTargetIndex]
                        ? ticketStore.draft.items[voucherTargetIndex].productId
                        : 0
                "
                @select="handleVoucherSelect"
            />
        </div>
    </AppLayout>
</template>
