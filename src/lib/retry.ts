export const RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelayMs: 300,
    maxDelayMs: 4000,
}

export function computeBackoffDelay(
    attempt: number,
    random: () => number = Math.random
): number {
    const exp = RETRY_CONFIG.baseDelayMs * 2 ** attempt
    return Math.min(exp, RETRY_CONFIG.maxDelayMs) * random()
}

export function isRetryableStatus(status: number): boolean {
    return status >= 500
}

export function isRetryableMethod(
    method: string,
    hasIdempotencyKey: boolean
): boolean {
    const upper = method.toUpperCase()
    if (upper === 'GET') return true
    // POST is only safe to retry when the server can replay a previous result.
    return upper === 'POST' && hasIdempotencyKey
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
