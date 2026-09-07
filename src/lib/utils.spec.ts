import { describe, expect, it } from 'vitest'

import { cn, extractData } from './utils'

describe('cn', () => {
    it('merges single class', () => {
        expect(cn('foo')).toBe('foo')
    })

    it('merges multiple classes', () => {
        expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('resolves tailwind conflicts', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4')
    })

    it('handles conditional classes', () => {
        expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('handles empty input', () => {
        expect(cn()).toBe('')
    })
})

describe('extractData', () => {
    it('extracts data array from nested response', () => {
        const resp = { data: { data: [1, 2, 3] } }
        expect(extractData<number>(resp)).toEqual([1, 2, 3])
    })

    it('returns empty array when no data', () => {
        expect(extractData(undefined)).toEqual([])
    })

    it('returns empty array when inner data is not array', () => {
        const resp = { data: { data: 'not-array' } }
        expect(extractData(resp)).toEqual([])
    })

    it('returns empty array when no inner data key', () => {
        const resp = { data: {} }
        expect(extractData(resp)).toEqual([])
    })
})
