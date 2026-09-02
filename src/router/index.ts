import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterDashboardView from '@/views/RegisterDashboardView.vue'
import TicketCreateView from '@/views/TicketCreateView.vue'
import TicketListView from '@/views/TicketListView.vue'
import TicketSummaryView from '@/views/TicketSummaryView.vue'
import TicketPaymentView from '@/views/TicketPaymentView.vue'

const routes = [
    { path: '/', component: HomeView, meta: { requiresAuth: true } },
    { path: '/login', component: LoginView, meta: { requiresAuth: false } },
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
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})

router.beforeEach((to) => {
    const authStore = useAuthStore()

    if (to.meta.requiresAuth && !authStore.isLoggedIn()) {
        return {
            path: '/login',
            query: { redirect: to.fullPath },
        }
    }
})
