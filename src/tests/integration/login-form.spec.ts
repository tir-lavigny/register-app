import { flushPromises, mount } from '@vue/test-utils'
import { HttpResponse, http } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { getLoginResponseMock } from '@/api/generated/auth/auth.faker'
import LoginForm from '@/components/LoginForm.vue'

import { server } from '../setup'

const fakeUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    roles: [{ name: 'admin', permissions: [{ name: 'manage_users' }] }],
}

const DashboardView = { template: '<div>Dashboard</div>' }
const RegisterView = { template: '<div>Register</div>' }

function createTestRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/login', component: LoginForm },
            { path: '/register', component: RegisterView },
            { path: '/dashboard', component: DashboardView },
        ],
    })
}

async function mountLoginForm(initialRoute = '/login') {
    const pinia = createPinia()
    const router = createTestRouter()

    router.push(initialRoute)
    await router.isReady()

    const wrapper = mount(LoginForm, {
        global: {
            plugins: [pinia, router],
        },
    })

    return { wrapper, router, pinia }
}

async function fillAndSubmit(
    wrapper: ReturnType<typeof mount>,
    email = 'test@example.com',
    password = 'password123'
) {
    await wrapper.find('#email').setValue(email)
    await wrapper.find('#password').setValue(password)
    await wrapper.find('form').trigger('submit.prevent')
}

describe('LoginForm integration', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
    })

    it('submits login and redirects to / on success', async () => {
        const { wrapper, router } = await mountLoginForm()

        server.use(
            http.post('*/auth/login', () =>
                HttpResponse.json(
                    getLoginResponseMock({
                        accessToken: 'token',
                        user: fakeUser,
                    }),
                    { status: 200 }
                )
            )
        )

        await fillAndSubmit(wrapper)
        await flushPromises()

        expect(router.currentRoute.value.path).toBe('/register')
    })

    it('redirects to query param on success', async () => {
        const { wrapper, router } = await mountLoginForm(
            '/login?redirect=/dashboard'
        )

        server.use(
            http.post('*/auth/login', () =>
                HttpResponse.json(
                    getLoginResponseMock({
                        accessToken: 'token',
                        user: fakeUser,
                    }),
                    { status: 200 }
                )
            )
        )

        await fillAndSubmit(wrapper)
        await flushPromises()

        expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('shows error message on 401', async () => {
        server.use(
            http.post('*/auth/login', () =>
                HttpResponse.json(
                    { message: 'Wrong credentials.', errors: null },
                    { status: 401 }
                )
            )
        )

        const { wrapper } = await mountLoginForm()

        await fillAndSubmit(wrapper)
        await flushPromises()

        expect(wrapper.text()).toContain('Wrong credentials.')
    })

    it('shows access error on 403', async () => {
        server.use(
            http.post('*/auth/login', () =>
                HttpResponse.json(
                    {
                        message: 'This account cannot access the register.',
                        errors: null,
                    },
                    { status: 403 }
                )
            )
        )

        const { wrapper } = await mountLoginForm()

        await fillAndSubmit(wrapper)
        await flushPromises()

        expect(wrapper.text()).toContain(
            'This account cannot access the register.'
        )
    })

    it('shows error message on 422', async () => {
        server.use(
            http.post('*/auth/login', () =>
                HttpResponse.json(
                    {
                        message: 'Validation failed',
                        errors: { email: ['The email is invalid.'] },
                    },
                    { status: 422 }
                )
            )
        )

        const { wrapper } = await mountLoginForm()

        await fillAndSubmit(wrapper)
        await flushPromises()

        expect(wrapper.text()).toContain('Validation failed')
    })

    it('disables button and shows loading text during submit', async () => {
        let resolveLogin!: () => void
        const loginDeferred = new Promise<void>((resolve) => {
            resolveLogin = resolve
        })

        server.use(
            http.post('*/auth/login', async () => {
                await loginDeferred
                return HttpResponse.json(
                    getLoginResponseMock({
                        accessToken: 'token',
                        user: fakeUser,
                    }),
                    { status: 200 }
                )
            })
        )

        const { wrapper } = await mountLoginForm()

        await fillAndSubmit(wrapper)
        await flushPromises()

        const button = wrapper.find('button')
        expect(button.attributes('disabled')).toBeDefined()
        expect(button.text()).toBe('Connexion...')

        resolveLogin()
        await flushPromises()

        expect(button.attributes('disabled')).toBeUndefined()
        expect(button.text()).toBe('Se connecter')
    })

    it('clears previous error on new submit', async () => {
        server.use(
            http.post('*/auth/login', () =>
                HttpResponse.json(
                    { message: 'Wrong credentials.', errors: null },
                    { status: 401 }
                )
            )
        )

        const { wrapper } = await mountLoginForm()

        await fillAndSubmit(wrapper)
        await flushPromises()

        expect(wrapper.text()).toContain('Wrong credentials.')

        server.use(
            http.post('*/auth/login', () =>
                HttpResponse.json(
                    getLoginResponseMock({
                        accessToken: 'token',
                        user: fakeUser,
                    }),
                    { status: 200 }
                )
            )
        )

        await fillAndSubmit(wrapper)
        await flushPromises()

        expect(wrapper.text()).not.toContain('Wrong credentials.')
    })
})
