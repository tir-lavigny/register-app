import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Collect files under `distDir` that must never be published: JavaScript
 * source maps and Vite's internal build manifests.
 *
 * @param {string} distDir
 * @returns {Promise<string[]>}
 */
export async function findForbiddenArtifacts(distDir) {
    const forbidden = []

    async function walk(dir) {
        const entries = await readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
            const path = join(dir, entry.name)

            if (entry.isDirectory()) {
                await walk(path)
                continue
            }

            const relativePath = relative(distDir, path).split(sep).join('/')
            const isViteManifest =
                relativePath === '.vite/manifest.json' ||
                relativePath === '.vite/ssr-manifest.json'

            if (entry.name.endsWith('.map') || isViteManifest) {
                forbidden.push(relativePath)
            }
        }
    }

    await walk(distDir)

    return forbidden
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const distDir = process.argv[2] ?? 'dist'
    const forbidden = await findForbiddenArtifacts(distDir)

    if (forbidden.length > 0) {
        console.error(
            `Refusing to publish ${forbidden.length} debug artifact(s) from ${distDir}:`
        )
        for (const path of forbidden) {
            console.error(` - ${path}`)
        }
        process.exit(1)
    }

    console.log(`No source maps or Vite build manifest in ${distDir}.`)
}
