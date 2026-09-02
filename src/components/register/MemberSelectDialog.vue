<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MemberResource } from '@/api/model'
import { useRegisterMembersIndex } from '@/api/generated/member/member'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [member: { id: number; name: string } | null]
}>()

const { data: membersData, isLoading } = useRegisterMembersIndex()

function extractArray<T>(val: unknown, key: string): T[] {
  if (val && typeof val === 'object' && key in val) {
    const arr = (val as Record<string, unknown>)[key]
    if (Array.isArray(arr)) return arr as T[]
  }
  return []
}

const members = computed(() => extractArray<MemberResource>(membersData.value, 'data'))
const searchQuery = ref('')

const filteredMembers = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return members.value
  return members.value.filter(
    (m) =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q),
  )
})

function handleSelect(member: MemberResource) {
  emit('select', { id: member.id, name: `${member.first_name} ${member.last_name}` })
  emit('update:open', false)
}

function handleClear() {
  emit('select', null)
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Sélectionner un membre</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-3">
        <Input
          v-model="searchQuery"
          placeholder="Rechercher un membre..."
          class="min-h-12"
        />

        <div v-if="isLoading" class="flex items-center justify-center py-4">
          <span class="text-sm text-gray-500">Chargement...</span>
        </div>

        <div v-else class="max-h-80 overflow-y-auto">
          <div
            v-for="member in filteredMembers"
            :key="member.id"
            class="flex min-h-12 cursor-pointer items-center rounded-lg px-3 py-2 transition-colors hover:bg-gray-100"
            @click="handleSelect(member)"
          >
            <span class="text-sm font-medium">{{ member.first_name }} {{ member.last_name }}</span>
          </div>
          <div v-if="filteredMembers.length === 0" class="py-4 text-center text-sm text-gray-500">
            Aucun membre trouvé
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClear">Sans membre</Button>
        <Button variant="ghost" @click="emit('update:open', false)">Fermer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>