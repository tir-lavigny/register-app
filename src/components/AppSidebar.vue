<script setup lang="ts">
import { ChevronUp, Download, MapPin, Trash2, User2 } from '@lucide/vue'
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SidebarProps } from '@/components/ui/sidebar'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { clearReferenceDataCache } from '@/lib/pwa-cache'
import { useAuthStore } from '@/stores/auth'
import { useStockLocationStore } from '@/stores/stock-location'

import AppLogoIcon from './AppLogoIcon.vue'

const props = defineProps<SidebarProps>()
const authStore = useAuthStore()
const locationStore = useStockLocationStore()
const { canInstall, isInstalled, install } = usePwaInstall()
const buildTag = import.meta.env.VITE_BUILD_TAG || 'unknown'

onMounted(async () => {
    locationStore.loadFromStorage()
    if (locationStore.locations.length === 0) {
        await locationStore.fetchLocations()
    }
})

const handleCacheClear = async () => {
    const res = await clearReferenceDataCache()
    if (res) {
        toast.success('Cache vidé avec succès')
    } else {
        toast.error('Erreur lors du vidage du cache')
    }
}
</script>

<template>
    <Sidebar v-bind="props">
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" as-child>
                        <RouterLink to="/">
                            <div
                                class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                            >
                                <AppLogoIcon class="size-4" />
                            </div>
                            <div
                                class="grid flex-1 text-left text-sm leading-tight"
                            >
                                <span class="truncate font-medium"
                                    >Tir Lavigny</span
                                >
                                <span class="truncate text-xs"
                                    >Caisse &middot; {{ buildTag }}</span
                                >
                            </div>
                        </RouterLink>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Caisse</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger as-child>
                                    <SidebarMenuButton>
                                        <MapPin />
                                        {{
                                            locationStore.activeLocation
                                                ?.name ?? 'Aucun'
                                        }}
                                        <ChevronUp class="ml-auto" />
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    side="bottom"
                                    class="w-(--reka-popper-anchor-width)"
                                >
                                    <DropdownMenuItem
                                        v-for="loc in locationStore.locations"
                                        :key="loc.id"
                                        @click="
                                            locationStore.setActiveLocation(
                                                loc.id
                                            )
                                        "
                                    >
                                        {{ loc.name }}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                        <SidebarMenuItem v-if="canInstall && !isInstalled">
                            <SidebarMenuButton @click="install">
                                <Download />
                                Installer l'app
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton @click="handleCacheClear()">
                        <Trash2 />
                        Vider le cache
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <SidebarMenuButton>
                                <User2 />
                                {{ authStore.user?.name || 'Utilisateur' }}
                                <ChevronUp class="ml-auto" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            class="w-(--reka-popper-anchor-width)"
                        >
                            <DropdownMenuItem>
                                <span @click="authStore.logout()">
                                    Se déconnecter
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
</template>
