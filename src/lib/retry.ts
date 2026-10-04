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

export function isRetryableMethod(method: string): boolean {
    return method.toUpperCase() === 'GET'
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
