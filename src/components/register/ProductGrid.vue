<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Product } from '@/api/model'
import { useRegisterProductsIndex } from '@/api/generated/product/product'
import { useRegisterCategoriesIndex } from '@/api/generated/category/category'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import ProductCard from './ProductCard.vue'

const emit = defineEmits<{
  'select-product': [product: Product]
}>()

const { data: categoriesData, isLoading: categoriesLoading } = useRegisterCategoriesIndex()
const { data: productsData, isLoading: productsLoading } = useRegisterProductsIndex()

function extractArray<T>(val: unknown, key: string): T[] {
  if (val && typeof val === 'object' && key in val) {
    const arr = (val as Record<string, unknown>)[key]
    if (Array.isArray(arr)) return arr as T[]
  }
  return []
}

const categories = computed(() => extractArray<{ id: number; name: string }>(categoriesData.value, 'data'))
const products = computed(() => extractArray<Product>(productsData.value, 'data'))

const activeTab = ref('all')

const filteredProducts = computed(() => {
  if (activeTab.value === 'all') return products.value
  const catId = Number(activeTab.value)
  return products.value.filter((p) => p.category_id === catId)
})

function handleSelectProduct(product: Product) {
  emit('select-product', product)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="categoriesLoading || productsLoading" class="flex items-center justify-center py-8">
      <span class="text-sm text-gray-500">Chargement...</span>
    </div>
    <template v-else>
      <Tabs v-model="activeTab">
        <TabsList class="w-full overflow-x-auto">
          <TabsTrigger value="all">Tout</TabsTrigger>
          <TabsTrigger v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
            {{ cat.name }}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ProductCard
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
              @click="handleSelectProduct"
            />
          </div>
        </TabsContent>
        <TabsContent v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
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