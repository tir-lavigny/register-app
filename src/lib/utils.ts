import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function extractData<T>(resp: unknown): T[] {
    const outer = resp as Record<string, unknown> | undefined
    const inner = outer?.data as Record<string, unknown> | undefined
    return (Array.isArray(inner?.data) ? inner.data : []) as T[]
}
