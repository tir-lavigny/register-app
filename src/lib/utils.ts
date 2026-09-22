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

const dateFormatter = new Intl.DateTimeFormat('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
})

export function formatDate(iso: string): string {
    return dateFormatter.format(new Date(iso))
}

export function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    return dateTimeFormatter.format(new Date(iso))
}
