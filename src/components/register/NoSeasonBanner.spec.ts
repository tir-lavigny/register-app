import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSeasonStore } from '@/stores/season'
import NoSeasonBanner from './NoSeasonBanner.vue'

describe('NoSeasonBanner', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the error message from the season store', async () => {
    const seasonStore = useSeasonStore()
    seasonStore.error = 'Aucune saison active.'

    const wrapper = mount(NoSeasonBanner)

    expect(wrapper.text()).toContain('Aucune saison active.')
  })

  it('renders the error title', () => {
    const wrapper = mount(NoSeasonBanner)

    expect(wrapper.text()).toContain('Erreur')
  })

  it('renders the AlertTriangle icon', () => {
    const wrapper = mount(NoSeasonBanner)

    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
  })

  it('renders centered layout', () => {
    const wrapper = mount(NoSeasonBanner)

    const container = wrapper.find('.flex.min-h-screen')
    expect(container.exists()).toBe(true)
  })

  it('displays the error message in a styled container', () => {
    const seasonStore = useSeasonStore()
    seasonStore.error = 'Test error message'

    const wrapper = mount(NoSeasonBanner)

    expect(wrapper.text()).toContain('Test error message')
    expect(wrapper.text()).toContain('Erreur')
  })
})
