<script setup lang="ts">
import { WifiOff } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'

const router = useRouter()
const reconnecting = ref(false)

async function checkOnline() {
    if (!navigator.onLine) return
    reconnecting.value = true
    try {
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' })
        router.push('/register')
    } catch {
        reconnecting.value = false
    }
}

onMounted(() => {
    window.addEventListener('online', checkOnline)
    document.addEventListener('visibilitychange', checkOnline)
})
onUnmounted(() => {
    window.removeEventListener('online', checkOnline)
    document.removeEventListener('visibilitychange', checkOnline)
})
</script>

<template>
    <AppLayout>
        <div
            class="flex flex-col items-center justify-center gap-4 p-8 text-center"
        >
            <WifiOff class="text-muted-foreground size-12" />
            <div>
                <h1 class="text-xl font-semibold">Pas de connexion internet</h1>
                <p class="text-muted-foreground mt-1 text-sm">
                    Vérifiez votre connexion et réessayez.
                </p>
            </div>
            <button
                class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
                :disabled="reconnecting"
                @click="checkOnline"
            >
                {{ reconnecting ? 'Reconnexion...' : 'Réessayer' }}
            </button>
        </div>
    </AppLayout>
</template>
