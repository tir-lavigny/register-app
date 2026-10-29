import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import LoginView from '@/views/LoginView.vue'
import OfflineView from '@/views/OfflineView.vue'
import RegisterDashboardView from '@/views/RegisterDashboardView.vue'
import StockLossCreateView from '@/views/StockLossCreateView.vue'
import StockLossesView from '@/views/StockLossesView.vue'
import TicketCreateView from '@/views/TicketCreateView.vue'
import TicketListView from '@/views/TicketListView.vue'
import TicketPaymentView from '@/views/TicketPaymentView.vue'
import TicketSummaryView from '@/views/TicketSummaryView.vue'

const routes = [
    { path: '/', redirect: '/register' },
    { path: '/login', component: LoginView, meta: { requiresAuth: false } },
    { path: '/offline', component: OfflineView, meta: { requiresAuth: false } },
    {
        path: '/register',
        component: RegisterDashboardView,
        meta: { requiresAuth: true },
    },
    {
        path: '/register/ticket/new',
        component: TicketCreateView,
        meta: { requiresAuth: true },
    },
    {
        path: '/register/ticket/summary',
        component: TicketSummaryView,
        meta: { requiresAuth: true },
    },
    {
        path: '/register/ticket/payment',
        component: TicketPaymentView,
        meta: { requiresAuth: true },
    },
    {
        path: '/register/tickets',
        component: TicketListView,
        meta: { requiresAuth: true },
    },
    {
        path: '/register/stock-losses',
        component: StockLossesView,
        meta: { requiresAuth: true },
    },
    {
        path: '/register/stock-losses/new',
        component: StockLossCreateView,
        meta: { requiresAuth: true },
    },
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})

router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth) {
        if (!navigator.onLine) {
            return { path: '/offline' }
        }

        if (!authStore.isLoggedIn()) {
            return {
                path: '/login',
                query: { redirect: to.fullPath },
            }
        }

        if (authStore.isLoggedIn() && !authStore.user) {
            await authStore.fetchMe()
            if (!authStore.user) {
                return {
                    path: '/login',
                    query: { redirect: to.fullPath },
                }
            }
        }
    }
})
