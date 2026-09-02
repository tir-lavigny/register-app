import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSeasonStore } from '@/stores/season'
import OpenDayDialog from './OpenDayDialog.vue'

const mockStore = vi.fn()

vi.mock('@/api/generated/operating-day/operating-day', () => ({
  registerOperatingDaysCurrent: vi.fn().mockResolvedValue({
    data: { message: 'No open operating day for today.' },
    status: 404,
    headers: new Headers(),
  }),
  registerOperatingDaysStore: (...args: unknown[]) => mockStore(...args),
  registerOperatingDaysUpdate: vi.fn(),
  registerOperatingDaysShow: vi.fn(),
}))

describe('OpenDayDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function mountDialog(open = true) {
    return mount(OpenDayDialog, {
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

    expect(wrapper.text()).toContain('Ouvrir une nouvelle journée?')
  })

  it('renders the title', () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Ouvrir la journée')
  })

  it('renders confirm and cancel buttons', () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Ouvrir')
    expect(wrapper.text()).toContain('Annuler')
  })

  it('calls store.createDay when confirm is clicked', async () => {
    mockStore.mockResolvedValue({
      data: { data: { id: 1, season_id: 1 } },
      status: 201,
      headers: new Headers(),
    })

    const seasonStore = useSeasonStore()
    seasonStore.currentSeason = {
      id: 1,
      name: 'S1',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    }

    const wrapper = mountDialog()

    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons.find((b) => b.text() === 'Ouvrir')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(mockStore).toHaveBeenCalledWith({ season_id: 1 })
  })

  it('emits confirm event on success', async () => {
    mockStore.mockResolvedValue({
      data: { data: { id: 1, season_id: 1 } },
      status: 201,
      headers: new Headers(),
    })

    const seasonStore = useSeasonStore()
    seasonStore.currentSeason = {
      id: 1,
      name: 'S1',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    }

    const wrapper = mountDialog()

    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons.find((b) => b.text() === 'Ouvrir')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emits update:open false on success', async () => {
    mockStore.mockResolvedValue({
      data: { data: { id: 1, season_id: 1 } },
      status: 201,
      headers: new Headers(),
    })

    const seasonStore = useSeasonStore()
    seasonStore.currentSeason = {
      id: 1,
      name: 'S1',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    }

    const wrapper = mountDialog()

    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons.find((b) => b.text() === 'Ouvrir')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')![0]).toEqual([false])
  })

  it('shows loading text while submitting', async () => {
    let resolveCreate!: (value: { data: { data: { id: number; season_id: number } }; status: number; headers: Headers }) => void
    const createDeferred = new Promise<typeof resolveCreate extends (value: infer R) => void ? R : never>((resolve) => {
      resolveCreate = resolve as typeof resolveCreate
    })
    mockStore.mockReturnValue(createDeferred)

    const seasonStore = useSeasonStore()
    seasonStore.currentSeason = {
      id: 1,
      name: 'S1',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    }

    const wrapper = mountDialog()

    const buttons = wrapper.findAll('button')
    const confirmBtn = buttons.find((b) => b.text() === 'Ouvrir')
    await confirmBtn!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain("Ouverture...")

    resolveCreate({
      data: { data: { id: 1, season_id: 1 } },
      status: 201,
      headers: new Headers(),
    })
    await flushPromises()
  })
})
