import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OperatingDayResource } from '@/api/model'
import { useOperatingDayStore } from '@/stores/operating-day'

import DayStatusCard from './DayStatusCard.vue'

vi.mock('@/lib/permissions', () => ({
    hasPermission: vi.fn().mockReturnValue(true),
    Permissions: {
        OPEN_DAY: 'open day',
        CLOSE_DAY: 'close day',
        REOPEN_DAY: 'reopen day',
    },
}))

function makeDay(
    overrides: Partial<OperatingDayResource> & { id: number }
): OperatingDayResource {
    return {
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
        tickets: [],
        ...overrides,
    }
}

describe('DayStatusCard', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    describe('when day is open', () => {
        it('shows OUVERT badge', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({ id: 1, closed_at: null })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            expect(wrapper.text()).toContain('OUVERT')
        })

        it('does not show FERMÉ badge', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({ id: 1, closed_at: null })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            expect(wrapper.text()).not.toContain('FERMÉ')
        })

        it('shows the formatted date', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({ id: 1, date: '2026-09-02' })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            expect(wrapper.text()).toContain('02.09.2026')
        })

        it('shows formatted start time', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({
                id: 1,
                started_at: '2026-09-02T08:00:00Z',
            })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            expect(wrapper.text()).toMatch(/\d{2}:\d{2}/)
        })

        it('shows close button', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({ id: 1, closed_at: null })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const closeBtn = buttons.find((b) => b.text() === 'Fermer')
            expect(closeBtn).toBeDefined()
        })

        it('emits close event when close button is clicked', async () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({ id: 1, closed_at: null })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const closeBtn = buttons.find((b) => b.text() === 'Fermer')
            await closeBtn!.trigger('click')

            expect(wrapper.emitted('close')).toHaveLength(1)
        })

        it('does not show open button', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({ id: 1, closed_at: null })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const openBtn = buttons.find((b) => b.text().includes('Ouvrir'))
            expect(openBtn).toBeUndefined()
        })
    })

    describe('when day is closed', () => {
        it('shows FERMÉ badge', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
            })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            expect(wrapper.text()).toContain('FERMÉ')
        })

        it('does not show OUVERT badge', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
            })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            expect(wrapper.text()).not.toContain('OUVERT')
        })

        it('shows formatted closed time', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
            })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            expect(wrapper.text()).toMatch(/\d{2}:\d{2}/)
        })

        it('does not show open button', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
            })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const openBtn = buttons.find((b) => b.text().includes('Ouvrir'))
            expect(openBtn).toBeUndefined()
        })

        it('shows reopen button', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
            })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const reopenBtn = buttons.find((b) => b.text() === 'Rouvrir')
            expect(reopenBtn).toBeDefined()
        })

        it('emits reopen event when reopen button is clicked', async () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
            })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const reopenBtn = buttons.find((b) => b.text() === 'Rouvrir')
            await reopenBtn!.trigger('click')

            expect(wrapper.emitted('reopen')).toHaveLength(1)
        })

        it('does not show close button', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({
                id: 1,
                closed_at: '2026-09-02T18:00:00Z',
            })

            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const closeBtn = buttons.find((b) => b.text() === 'Fermer')
            expect(closeBtn).toBeUndefined()
        })
    })

    describe('when loading', () => {
        it('disables buttons', () => {
            const dayStore = useOperatingDayStore()
            dayStore.currentDay = makeDay({ id: 1, closed_at: null })

            const wrapper = mount(DayStatusCard, {
                props: { loading: true },
            })

            const buttons = wrapper.findAll('button')
            for (const btn of buttons) {
                expect(btn.attributes('disabled')).toBeDefined()
            }
        })
    })

    describe('when no current day', () => {
        it('shows open button', () => {
            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const openBtn = buttons.find((b) => b.text().includes('Ouvrir'))
            expect(openBtn).toBeDefined()
        })

        it('emits open event when open button is clicked', async () => {
            const wrapper = mount(DayStatusCard, {
                props: { loading: false },
            })

            const buttons = wrapper.findAll('button')
            const openBtn = buttons.find((b) => b.text().includes('Ouvrir'))
            await openBtn!.trigger('click')

            expect(wrapper.emitted('open')).toHaveLength(1)
        })
    })
})
