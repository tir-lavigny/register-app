import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import { getRegisterMembersVouchersMockHandler } from '@/api/generated/member/member.msw'
import type { Voucher } from '@/api/model'
import VoucherSelectDialog from '@/components/register/VoucherSelectDialog.vue'

import { server } from '../../tests/setup'

type DialogProps = {
    open: boolean
    memberId: number
    productId: number
    selectedIds: number[]
    excludeIds: number[]
    maxSelectable: number
}

function makeVoucher(id: number, productId = 1): Voucher {
    return {
        id,
        discount_percent: '100',
        discount_fixed: null,
        product_id: productId,
        season_id: 1,
        member_id: 1,
        deleted_at: null,
        created_at: null,
        updated_at: null,
    }
}

const vouchers = [makeVoucher(101), makeVoucher(102), makeVoucher(103)]

function mountDialog(props: Partial<DialogProps> = {}) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    })

    return mount(VoucherSelectDialog, {
        props: {
            open: true,
            memberId: 1,
            productId: 1,
            selectedIds: [],
            excludeIds: [],
            maxSelectable: 2,
            ...props,
        },
        global: {
            plugins: [[VueQueryPlugin, { queryClient }]],
        },
        attachTo: document.body,
    })
}

function findOption(id: number): HTMLElement | null {
    const label = [...document.body.querySelectorAll('span')].find(
        (el) => el.textContent?.trim() === `Bon #${id}`
    )
    return label?.closest('div.cursor-pointer') ?? null
}

function findButton(label: string): HTMLElement | null {
    return [...document.body.querySelectorAll('button')].find(
        (el) => el.textContent?.trim() === label
    ) as HTMLElement | null
}

describe('VoucherSelectDialog', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
        server.use(
            getRegisterMembersVouchersMockHandler({
                data: vouchers,
            })
        )
    })

    it('lists member vouchers for the product', async () => {
        mountDialog()
        await flushPromises()

        expect(findOption(101)).not.toBeNull()
        expect(findOption(102)).not.toBeNull()
        expect(findOption(103)).not.toBeNull()
    })

    it('emits selected vouchers on confirm', async () => {
        const wrapper = mountDialog()
        await flushPromises()

        findOption(101)?.click()
        findOption(102)?.click()
        await flushPromises()

        findButton('Appliquer')?.click()
        await wrapper.vm.$nextTick()

        const events = wrapper.emitted('select')
        expect(events).toBeTruthy()
        expect(events![0][0]).toEqual([vouchers[0], vouchers[1]])
    })

    it('caps selection at maxSelectable and disables remaining options', async () => {
        mountDialog()
        await flushPromises()

        findOption(101)?.click()
        findOption(102)?.click()
        await flushPromises()

        const third = findOption(103)
        expect(third?.className).toContain('opacity-50')

        third?.click()
        await flushPromises()

        expect(document.body.textContent).toContain('2 / 2')
    })

    it('excludes vouchers already applied elsewhere in the draft', async () => {
        mountDialog({ excludeIds: [102] })
        await flushPromises()

        expect(findOption(101)).not.toBeNull()
        expect(findOption(102)).toBeNull()
        expect(findOption(103)).not.toBeNull()
    })

    it('preselects currently applied vouchers when opened', async () => {
        mountDialog({ selectedIds: [101] })
        await flushPromises()

        expect(document.body.textContent).toContain('1 / 2')
    })

    it('emits empty array when clearing', async () => {
        const wrapper = mountDialog()
        await flushPromises()

        findButton('Sans bon')?.click()
        await wrapper.vm.$nextTick()

        const events = wrapper.emitted('select')
        expect(events![0][0]).toEqual([])
    })

    it('does not fetch when member is not selected', async () => {
        mountDialog({ memberId: 0 })
        await flushPromises()

        expect(document.body.textContent).not.toContain('Bon #101')
    })
})
