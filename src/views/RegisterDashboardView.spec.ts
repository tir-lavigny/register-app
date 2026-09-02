import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import RegisterDashboardView from './RegisterDashboardView.vue'

const mockFetchCurrentSeason = vi.fn()
const mockFetchCurrentDay = vi.fn()

vi.mock('@/stores/season', () => ({
    useSeasonStore: () => ({
        currentSeason: { id: 1, name: 'Summer 2026', start_date: '2026-06-01', end_date: '2026-09-30' },
        error: null,
        loading: false,
        seasonId: 1,
        fetchCurrentSeason: mockFetchCurrentSeason,
    }),
}))

vi.mock('@/stores/operating-day', () => ({
    useOperatingDayStore: vi.fn(() => ({
        currentDay: null,
        loading: false,
        isOpen: false,
        dayId: null,
        activeTickets: [],
        canceledTickets: [],
        cashTotal: 0,
        twintTotal: 0,
        fetchCurrentDay: mockFetchCurrentDay,
        createDay: vi.fn(),
        closeDay: vi.fn(),
        reopenDay: vi.fn(),
        refreshDay: vi.fn(),
    })),
}))

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/register', component: { template: '<div />' } },
        { path: '/register/ticket/new', component: { template: '<div />' } },
        { path: '/register/tickets', component: { template: '<div />' } },
    ],
})

describe('RegisterDashboardView', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetchCurrentSeason.mockResolvedValue(undefined)
        mockFetchCurrentDay.mockResolvedValue(undefined)
    })

    function mountView() {
        return mount(RegisterDashboardView, {
            global: {
                plugins: [
                    router,
                    createTestingPinia({ createSpy: vi.fn, stubActions: false }),
                ],
            },
        })
    }

    it('renders the dashboard title', async () => {
        const wrapper = mountView()
        await flushPromises()
        expect(wrapper.text()).toContain('Tableau de bord')
    })

    it('fetches season and day on mount', async () => {
        mountView()
        await flushPromises()
        expect(mockFetchCurrentSeason).toHaveBeenCalled()
        expect(mockFetchCurrentDay).toHaveBeenCalled()
    })

    it('shows action cards', async () => {
        const wrapper = mountView()
        await flushPromises()
        expect(wrapper.text()).toContain('Nouveau ticket')
        expect(wrapper.text()).toContain('Tickets du jour')
    })

    it('shows close card when day is open', async () => {
        const { useOperatingDayStore } = await import('@/stores/operating-day')
        vi.mocked(useOperatingDayStore).mockReturnValue({
            currentDay: {
                id: 1,
                date: '2026-09-02',
                started_at: '2026-09-02T08:00:00Z',
                closed_at: null,
                season_id: 1,
                cash_remark: null,
                closing_balance: null,
                total_cash: '0',
                total_twint: '0',
                tickets: [],
            },
            loading: false,
            isOpen: true,
            dayId: 1,
            activeTickets: [],
            canceledTickets: [],
            cashTotal: 0,
            twintTotal: 0,
            fetchCurrentDay: mockFetchCurrentDay,
            createDay: vi.fn(),
            closeDay: vi.fn(),
            reopenDay: vi.fn(),
            refreshDay: vi.fn(),
        })

        const wrapper = mountView()
        await flushPromises()
        expect(wrapper.text()).toContain('Fermer la journée')
    })
})
