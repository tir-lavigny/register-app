<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
    <Toaster position="top-center" />
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger class="-ml-1" />
            </header>
            <slot />
        </SidebarInset>
    </SidebarProvider>
</template>
