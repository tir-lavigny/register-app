import { describe, expect, it } from 'vitest'

import {
    RETRY_CONFIG,
    computeBackoffDelay,
    isRetryableMethod,
    isRetryableStatus,
    sleep,
} from './retry'

describe('retry config', () => {
    it('has 3 max attempts, 300ms base, 4s cap', () => {
        expect(RETRY_CONFIG).toEqual({
            maxAttempts: 3,
            baseDelayMs: 300,
            maxDelayMs: 4000,
        })
    })
})

describe('computeBackoffDelay', () => {
    it('is exponential from base delay when random is 1', () => {
        expect(computeBackoffDelay(0, () => 1)).toBe(300)
        expect(computeBackoffDelay(1, () => 1)).toBe(600)
        expect(computeBackoffDelay(2, () => 1)).toBe(1200)
        expect(computeBackoffDelay(3, () => 1)).toBe(2400)
    })

    it('caps at maxDelayMs', () => {
        expect(computeBackoffDelay(5, () => 1)).toBe(RETRY_CONFIG.maxDelayMs)
        expect(computeBackoffDelay(10, () => 1)).toBe(RETRY_CONFIG.maxDelayMs)
    })

    it('applies full jitter', () => {
        expect(computeBackoffDelay(0, () => 0)).toBe(0)
        expect(computeBackoffDelay(1, () => 0.5)).toBe(300)
        expect(computeBackoffDelay(2, () => 0.25)).toBe(300)
    })
})

describe('isRetryableStatus', () => {
    it('retries on 5xx', () => {
        expect(isRetryableStatus(500)).toBe(true)
        expect(isRetryableStatus(502)).toBe(true)
        expect(isRetryableStatus(503)).toBe(true)
        expect(isRetryableStatus(599)).toBe(true)
    })

    it('does not retry on other statuses', () => {
        expect(isRetryableStatus(200)).toBe(false)
        expect(isRetryableStatus(201)).toBe(false)
        expect(isRetryableStatus(404)).toBe(false)
        expect(isRetryableStatus(401)).toBe(false)
        expect(isRetryableStatus(422)).toBe(false)
    })
})

describe('isRetryableMethod', () => {
    it('retries GET regardless of idempotency key', () => {
        expect(isRetryableMethod('GET', false)).toBe(true)
        expect(isRetryableMethod('get', false)).toBe(true)
        expect(isRetryableMethod('GET', true)).toBe(true)
    })

    it('retries POST only with an idempotency key', () => {
        expect(isRetryableMethod('POST', true)).toBe(true)
        expect(isRetryableMethod('post', true)).toBe(true)
        expect(isRetryableMethod('POST', false)).toBe(false)
    })

    it('never retries other methods', () => {
        expect(isRetryableMethod('PUT', true)).toBe(false)
        expect(isRetryableMethod('DELETE', true)).toBe(false)
        expect(isRetryableMethod('HEAD', false)).toBe(false)
        expect(isRetryableMethod('PATCH', true)).toBe(false)
    })
})

describe('sleep', () => {
    it('resolves after the given delay', async () => {
        const start = Date.now()
        await sleep(50)
        expect(Date.now() - start).toBeGreaterThanOrEqual(40)
    })
})
