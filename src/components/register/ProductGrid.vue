<script setup lang="ts">
import { computed, ref } from 'vue'

import { useRegisterCategoriesIndex } from '@/api/generated/category/category'
import { useRegisterProductsIndex } from '@/api/generated/product/product'
import type { Product } from '@/api/model'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { extractData } from '@/lib/utils'

import ProductCard from './ProductCard.vue'

const emit = defineEmits<{
    'select-product': [product: Product]
}>()

const { data: categoriesData, isLoading: categoriesLoading } =
    useRegisterCategoriesIndex()
const { data: productsData, isLoading: productsLoading } =
    useRegisterProductsIndex()

const categories = computed(() =>
    extractData<{ id: number; name: string }>(categoriesData.value)
)
const products = computed(() => extractData<Product>(productsData.value))

const activeTab = ref(
    categories.value.at(0)?.id ? String(categories.value.at(0)?.id) : '0'
)

const filteredProducts = computed(() => {
    const catId = Number(activeTab.value)
    return products.value.filter((p) => p.category_id === catId)
})

function handleSelectProduct(product: Product) {
    emit('select-product', product)
}
</script>

<template>
    <div class="flex flex-col gap-3">
        <div
            v-if="categoriesLoading || productsLoading"
            class="flex items-center justify-center py-8"
        >
            <span class="text-sm text-muted-foreground">Chargement...</span>
        </div>
        <template v-else>
            <Tabs v-model="activeTab">
                <TabsList class="w-full overflow-x-auto">
                    <TabsTrigger
                        v-for="cat in categories"
                        :key="cat.id"
                        :value="String(cat.id)"
                    >
                        {{ cat.name }}
                    </TabsTrigger>
                </TabsList>

                <TabsContent
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="String(cat.id)"
                >
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <ProductCard
                            v-for="product in filteredProducts"
                            :key="product.id"
                            :product="product"
                            @click="handleSelectProduct"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </template>
    </div>
</template>
