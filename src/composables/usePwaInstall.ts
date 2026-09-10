import { onMounted, ref } from 'vue'

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstalled = ref(false)

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
    const canInstall = ref(false)

    onMounted(() => {
        isInstalled.value =
            (window.matchMedia?.('(display-mode: standalone)').matches ??
                false) ||
            (navigator as Navigator & { standalone?: boolean }).standalone ===
                true

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault()
            deferredPrompt.value = e as BeforeInstallPromptEvent
            canInstall.value = true
        })

        window.addEventListener('appinstalled', () => {
            isInstalled.value = true
            canInstall.value = false
            deferredPrompt.value = null
        })
    })

    async function install() {
        if (!deferredPrompt.value) return
        await deferredPrompt.value.prompt()
        const { outcome } = await deferredPrompt.value.userChoice
        if (outcome === 'accepted') {
            isInstalled.value = true
            canInstall.value = false
        }
        deferredPrompt.value = null
    }

    return { canInstall, isInstalled, install }
}
