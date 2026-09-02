<script setup lang="ts">
import { ChevronUp, User2 } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'

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

import AppLogoIcon from './AppLogoIcon.vue'

const props = defineProps<SidebarProps>()
const route = useRoute()

interface NavItem {
    title: string
    url: string
    isActive?: boolean
    items?: NavItem[]
}
const navMain: NavItem[] = [
    {
        title: 'Caisse',
        url: '/register',
        items: [
            {
                title: 'Tableau de bord',
                url: '/register',
            },
            {
                title: 'Nouveau ticket',
                url: '/register/ticket/new',
            },
            {
                title: 'Tickets du jour',
                url: '/register/tickets',
            },
        ],
    },
]
</script>

<template>
    <Sidebar v-bind="props">
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" as-child>
                        <a>
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
                                <span class="truncate text-xs">Caisse</span>
                            </div>
                        </a>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
            <SidebarGroup v-for="item in navMain" :key="item.title">
                <SidebarGroupLabel>{{ item.title }}</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                            <SidebarMenuItem
                                v-for="childItem in item.items"
                                :key="childItem.title"
                            >
                                <SidebarMenuButton
                                    as-child
                                    :is-active="route.path === childItem.url"
                                >
                                    <RouterLink :to="childItem.url">{{
                                        childItem.title
                                    }}</RouterLink>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <SidebarMenuButton>
                                <User2 /> Username
                                <ChevronUp class="ml-auto" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            class="w-(--reka-popper-anchor-width)"
                        >
                            <DropdownMenuItem>
                                <span>Account</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <span>Billing</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <span>Sign out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
</template>
