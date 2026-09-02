import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import DaySummaryCard from './DaySummaryCard.vue'

describe('DaySummaryCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders ticket count', () => {
    const wrapper = mount(DaySummaryCard, {
      props: { ticketCount: 42, cashTotal: 0, twintTotal: 0 },
    })

    expect(wrapper.text()).toContain('42')
  })

  it('renders cash total formatted as CHF', () => {
    const wrapper = mount(DaySummaryCard, {
      props: { ticketCount: 0, cashTotal: 125.5, twintTotal: 0 },
    })

    expect(wrapper.text()).toContain('CHF 125.50')
  })

  it('renders twint total formatted as CHF', () => {
    const wrapper = mount(DaySummaryCard, {
      props: { ticketCount: 0, cashTotal: 0, twintTotal: 87 },
    })

    expect(wrapper.text()).toContain('CHF 87.00')
  })

  it('renders all summary values', () => {
    const wrapper = mount(DaySummaryCard, {
      props: { ticketCount: 15, cashTotal: 200.75, twintTotal: 50.25 },
    })

    expect(wrapper.text()).toContain('15')
    expect(wrapper.text()).toContain('CHF 200.75')
    expect(wrapper.text()).toContain('CHF 50.25')
  })

  it('renders summary title', () => {
    const wrapper = mount(DaySummaryCard, {
      props: { ticketCount: 0, cashTotal: 0, twintTotal: 0 },
    })

    expect(wrapper.text()).toContain('Résumé')
  })

  it('displays labels', () => {
    const wrapper = mount(DaySummaryCard, {
      props: { ticketCount: 0, cashTotal: 0, twintTotal: 0 },
    })

    expect(wrapper.text()).toContain('Tickets')
    expect(wrapper.text()).toContain('Espèces')
    expect(wrapper.text()).toContain('Twint')
  })

  it('formats zero values correctly', () => {
    const wrapper = mount(DaySummaryCard, {
      props: { ticketCount: 0, cashTotal: 0, twintTotal: 0 },
    })

    expect(wrapper.text()).toContain('CHF 0.00')
  })
})
