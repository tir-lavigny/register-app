import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { getAuthMock } from '@/api/generated/auth/auth.msw'
import { getStockLocationMock } from '@/api/generated/stock-location/stock-location.msw'

export const server = setupServer(...getAuthMock(), ...getStockLocationMock())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
