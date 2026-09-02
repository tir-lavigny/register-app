import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOperatingDayStore } from '@/stores/operating-day'
import CloseDayDialog from './CloseDayDialog.vue'

const mockFetchCurrent = vi.fn().mockResolvedValue({
  data: { data: null },
  status: 404,
  headers: new Headers(),
})
const mockUpdate = vi.fn()

vi.mock('@/api/generated/operating-day/operating-day', () => ({
  registerOperatingDaysCurrent: (...args: unknown[]) => mockFetchCurrent(...args),
  registerOperatingDaysStore: vi.fn(),
  registerOperatingDaysUpdate: (...args: unknown[]) => mockUpdate(...args),
  registerOperatingDaysShow: vi.fn(),
}))

describe('CloseDayDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function mountDialog(
    props: {
      open?: boolean
      cashTotal?: number
      twintTotal?: number
      ticketCount?: number
    } = {}
  ) {
    return mount(CloseDayDialog, {
      props: {
        open: true,
        cashTotal: 0,
        twintTotal: 0,
        ticketCount: 0,
        ...props,
      },
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

  it('renders the title', () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Fermer la journée')
  })

  it('renders ticket count', () => {
    const wrapper = mountDialog({ ticketCount: 25 })

    expect(wrapper.text()).toContain('25')
  })

  it('renders cash total formatted as CHF', () => {
    const wrapper = mountDialog({ cashTotal: 150.5 })

    expect(wrapper.text()).toContain('CHF 150.50')
  })

  it('renders twint total formatted as CHF', () => {
    const wrapper = mountDialog({ twintTotal: 75.25 })

    expect(wrapper.text()).toContain('CHF 75.25')
  })

  it('renders the cash remark textarea', () => {
    const wrapper = mountDialog()

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
  })

  it('renders confirm and cancel buttons', () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Fermer')
    expect(wrapper.text()).toContain('Annuler')
  })

  it('calls store.closeDay with remark when confirm is clicked', async () => {
    const dayStore = useOperatingDayStore()
    dayStore.currentDay = {
      id: 1,
      date: '2026-09-02',
      started_at: '2026-09-02T08:00:00Z',
      closed_at: null,
      season_id: 1,
      cash_remark: null,
      closing_balance: null,
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
          closed_at: '2026-09-02T18:00:00Z',
          season_id: 1,
          cash_remark: 'Missing CHF 5',
          closing_balance: null,
          total_cash: '150.00',
          total_twint: '50.00',
          created_at: null,
          updated_at: null,
        },
      },
      status: 200,
      headers: new Headers(),
    })

    const wrapper = mountDialog({ cashTotal: 150, twintTotal: 50, ticketCount: 10 })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Missing CHF 5')

    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons.find((b) => b.text() === 'Fermer')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(1, {
      status: 'closed',
      cash_remark: 'Missing CHF 5',
    })
  })

  it('calls store.closeDay without remark when empty', async () => {
    const dayStore = useOperatingDayStore()
    dayStore.currentDay = {
      id: 1,
      date: '2026-09-02',
      started_at: '2026-09-02T08:00:00Z',
      closed_at: null,
      season_id: 1,
      cash_remark: null,
      closing_balance: null,
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
          closed_at: '2026-09-02T18:00:00Z',
          season_id: 1,
          cash_remark: null,
          closing_balance: null,
          total_cash: '150.00',
          total_twint: '50.00',
          created_at: null,
          updated_at: null,
        },
      },
      status: 200,
      headers: new Headers(),
    })

    const wrapper = mountDialog()

    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons.find((b) => b.text() === 'Fermer')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(1, {
      status: 'closed',
      cash_remark: null,
    })
  })

  it('emits update:open false on success', async () => {
    const dayStore = useOperatingDayStore()
    dayStore.currentDay = {
      id: 1,
      date: '2026-09-02',
      started_at: '2026-09-02T08:00:00Z',
      closed_at: null,
      season_id: 1,
      cash_remark: null,
      closing_balance: null,
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
          closed_at: '2026-09-02T18:00:00Z',
          season_id: 1,
          cash_remark: null,
          closing_balance: null,
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
    const confirmBtn = buttons.find((b) => b.text() === 'Fermer')
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
      closed_at: null,
      season_id: 1,
      cash_remark: null,
      closing_balance: null,
      total_cash: '0.00',
      total_twint: '0.00',
      created_at: null,
      updated_at: null,
      tickets: [],
    }

    let resolveClose!: (value: { data: { data: Record<string, unknown> }; status: number; headers: Headers }) => void
    const closeDeferred = new Promise<typeof resolveClose extends (value: infer R) => void ? R : never>((resolve) => {
      resolveClose = resolve as typeof resolveClose
    })
    mockUpdate.mockReturnValue(closeDeferred)

    const wrapper = mountDialog()

    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons.find((b) => b.text() === 'Fermer')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Fermeture...')

    resolveClose({
      data: {
        data: {
          id: 1,
          date: '2026-09-02',
          started_at: '2026-09-02T08:00:00Z',
          closed_at: '2026-09-02T18:00:00Z',
          season_id: 1,
          cash_remark: null,
          closing_balance: null,
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

  it('displays remark label', () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Remarque espèces')
  })
})
