import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const checker = join(process.cwd(), 'scripts/check-dist.mjs')

let distDir: string | undefined

function makeDist(): string {
    distDir = mkdtempSync(join(tmpdir(), 'register-dist-'))
    mkdirSync(join(distDir, 'assets'), { recursive: true })

    return distDir
}

function runChecker(dir: string): void {
    execFileSync(process.execPath, [checker, dir], { stdio: 'pipe' })
}

afterEach(() => {
    if (distDir) {
        rmSync(distDir, { recursive: true, force: true })
        distDir = undefined
    }
})

describe('build artifact guard', () => {
    it('accepts a bundle with JavaScript and the PWA manifest', () => {
        const dir = makeDist()
        writeFileSync(join(dir, 'assets', 'index-abc123.js'), 'console.log(1)')
        writeFileSync(join(dir, 'manifest.webmanifest'), '{}')

        expect(() => runChecker(dir)).not.toThrow()
    })

    it('rejects JavaScript source maps', () => {
        const dir = makeDist()
        writeFileSync(join(dir, 'assets', 'index-abc123.js'), 'console.log(1)')
        writeFileSync(join(dir, 'assets', 'index-abc123.js.map'), '{}')

        expect(() => runChecker(dir)).toThrow()
    })

    it('rejects the Vite build manifest', () => {
        const dir = makeDist()
        mkdirSync(join(dir, '.vite'))
        writeFileSync(join(dir, '.vite', 'manifest.json'), '{}')

        expect(() => runChecker(dir)).toThrow()
    })
})
