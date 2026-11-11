import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOperatingDayStore } from '@/stores/operating-day'

import ReopenDayDialog from './ReopenDayDialog.vue'

const mockFetchCurrent = vi.fn().mockResolvedValue({
    data: { data: null },
    status: 404,
    headers: new Headers(),
})
const mockUpdate = vi.fn()

vi.mock('@/api/generated/operating-day/operating-day', () => ({
    registerOperatingDaysCurrent: (...args: unknown[]) =>
        mockFetchCurrent(...args),
    registerOperatingDaysStore: vi.fn(),
    registerOperatingDaysUpdate: (...args: unknown[]) => mockUpdate(...args),
    registerOperatingDaysShow: vi.fn(),
}))

describe('ReopenDayDialog', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    function mountDialog(open = true) {
        return mount(ReopenDayDialog, {
            props: { open },
            global: {
                stubs: {
                    Dialog: {
                        template: '<div v-if="open"><slot /></div>',
                        props: ['open'],
                        emits: ['update:open'],
                    },
                    DialogContent: {
                        template: '<div><slot /></div>',
                    },
                    DialogHeader: {
                        template: '<div><slot /></div>',
                    },
                    DialogTitle: {
                        template: '<div><slot /></div>',
                    },
                    DialogDescription: {
                        template: '<div><slot /></div>',
                    },
                    DialogFooter: {
                        template: '<div><slot /></div>',
                    },
                    DialogClose: {
                        template: '<span><slot /></span>',
                    },
                },
            },
        })
    }

    it('renders the confirmation message', () => {
        const wrapper = mountDialog()

        expect(wrapper.text()).toContain('Rouvrir cette journée?')
    })

    it('renders the title', () => {
        const wrapper = mountDialog()

        expect(wrapper.text()).toContain('Rouvrir la journée')
    })

    it('renders confirm and cancel buttons', () => {
        const wrapper = mountDialog()

        expect(wrapper.text()).toContain('Rouvrir')
        expect(wrapper.text()).toContain('Annuler')
    })

    it('calls store.reopenDay when confirm is clicked', async () => {
        const dayStore = useOperatingDayStore()
        dayStore.currentDay = {
            id: 1,
            date: '2026-09-02',
            started_at: '2026-09-02T08:00:00Z',
            closed_at: '2026-09-02T18:00:00Z',
            season_id: 1,
            cash_remark: null,
            closing_balance: 0,
            total_cash: '0.00',
            total_twint: '0.00',
            created_at: null,
            updated_at: null,
            tickets: [],
        }

        mockUpdate.mockResolvedValue({
            data: {
                data: {
                    id: 1,
                    date: '2026-09-02',
                    started_at: '2026-09-02T08:00:00Z',
                    closed_at: null,
                    season_id: 1,
                    cash_remark: null,
                    closing_balance: 0,
                    total_cash: '0.00',
                    total_twint: '0.00',
                    created_at: null,
                    updated_at: null,
                },
            },
            status: 200,
            headers: new Headers(),
        })

        const wrapper = mountDialog()

        const buttons = wrapper.findAll('button')
        const confirmBtn = buttons.find((b) => b.text() === 'Rouvrir')
        await confirmBtn!.trigger('click')
        await flushPromises()

        expect(mockUpdate).toHaveBeenCalledWith(
            1,
            { 'Idempotency-Key': expect.any(String) },
            { status: 'open' }
        )
    })

    it('emits update:open false on success', async () => {
        const dayStore = useOperatingDayStore()
        dayStore.currentDay = {
            id: 1,
            date: '2026-09-02',
            started_at: '2026-09-02T08:00:00Z',
            closed_at: '2026-09-02T18:00:00Z',
            season_id: 1,
            cash_remark: null,
            closing_balance: 0,
            total_cash: '0.00',
            total_twint: '0.00',
            created_at: null,
            updated_at: null,
            tickets: [],
        }

        mockUpdate.mockResolvedValue({
            data: {
                data: {
                    id: 1,
                    date: '2026-09-02',
                    started_at: '2026-09-02T08:00:00Z',
                    closed_at: null,
                    season_id: 1,
                    cash_remark: null,
                    closing_balance: 0,
                    total_cash: '0.00',
                    total_twint: '0.00',
                    created_at: null,
                    updated_at: null,
                },
            },
            status: 200,
            headers: new Headers(),
        })

        const wrapper = mountDialog()

        const buttons = wrapper.findAll('button')
        const confirmBtn = buttons.find((b) => b.text() === 'Rouvrir')
        await confirmBtn!.trigger('click')
        await flushPromises()

        expect(wrapper.emitted('update:open')).toBeTruthy()
        expect(wrapper.emitted('update:open')![0]).toEqual([false])
    })

    it('shows loading text while submitting', async () => {
        const dayStore = useOperatingDayStore()
        dayStore.currentDay = {
            id: 1,
            date: '2026-09-02',
            started_at: '2026-09-02T08:00:00Z',
            closed_at: '2026-09-02T18:00:00Z',
            season_id: 1,
            cash_remark: null,
            closing_balance: 0,
            total_cash: '0.00',
            total_twint: '0.00',
            created_at: null,
            updated_at: null,
            tickets: [],
        }

        let resolveReopen!: (value: {
            data: { data: Record<string, unknown> }
            status: number
            headers: Headers
        }) => void
        const reopenDeferred = new Promise<
            typeof resolveReopen extends (value: infer R) => void ? R : never
        >((resolve) => {
            resolveReopen = resolve as typeof resolveReopen
        })
        mockUpdate.mockReturnValue(reopenDeferred)

        const wrapper = mountDialog()

        const buttons = wrapper.findAll('button')
        const confirmBtn = buttons.find((b) => b.text() === 'Rouvrir')
        await confirmBtn!.trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('Réouverture...')

        resolveReopen({
            data: {
                data: {
                    id: 1,
                    date: '2026-09-02',
                    started_at: '2026-09-02T08:00:00Z',
                    closed_at: null,
                    season_id: 1,
                    cash_remark: null,
                    closing_balance: 0,
                    total_cash: '0.00',
                    total_twint: '0.00',
                    created_at: null,
                    updated_at: null,
                },
            },
            status: 200,
            headers: new Headers(),
        })
        await flushPromises()
    })
})
