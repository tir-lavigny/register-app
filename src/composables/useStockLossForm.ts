import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import { stockLossesStore } from '@/api/generated/stock-loss/stock-loss'
import type { ProductResource } from '@/api/model'
import { newIdempotencyKey } from '@/lib/idempotency'
import { useOperatingDayStore } from '@/stores/operating-day'
import { useStockLocationStore } from '@/stores/stock-location'

export function useStockLossForm() {
    const router = useRouter()
    const dayStore = useOperatingDayStore()
    const stockLocationStore = useStockLocationStore()

    const selectedProduct = ref<ProductResource | null>(null)
    const showDialog = ref(false)
    const quantity = ref(1)
    const reason = ref('')
    const submitting = ref(false)
    const hasTypedQuantity = ref(false)

    function selectProduct(product: ProductResource) {
        selectedProduct.value = product
        quantity.value = 1
        reason.value = ''
        hasTypedQuantity.value = false
        showDialog.value = true
    }

    function numpad(digit: string) {
        if (!hasTypedQuantity.value) {
            quantity.value = Number(digit)
            hasTypedQuantity.value = true
        } else {
            quantity.value = Number(quantity.value.toString() + digit)
        }
    }

    function backspace() {
        const str = quantity.value.toString()
        if (str.length <= 1) {
            quantity.value = 1
            hasTypedQuantity.value = false
        } else {
            quantity.value = Number(str.slice(0, -1))
        }
    }

    async function submit() {
        if (
            !selectedProduct.value ||
            !dayStore.dayId ||
            !stockLocationStore.activeLocationId
        )
            return
        if (quantity.value < 1 || !reason.value.trim()) return

        submitting.value = true
        try {
            const response = await stockLossesStore(
                {
                    stock_location_id: stockLocationStore.activeLocationId,
                    operating_day_id: dayStore.dayId,
                    product_id: selectedProduct.value.id,
                    quantity: quantity.value,
                    reason: reason.value.trim(),
                },
                {
                    'Idempotency-Key': newIdempotencyKey(),
                }
            )

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

    return {
        selectedProduct,
        showDialog,
        quantity,
        reason,
        submitting,
        selectProduct,
        numpad,
        backspace,
        submit,
    }
}
