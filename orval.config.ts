import { defineConfig } from 'orval'

export default defineConfig({
    api: {
        input: 'http://127.0.0.1:8000/docs/api.json',
        output: {
            mode: 'tags-split',
            target: 'src/api/generated',
            schemas: 'src/api/model',
            client: 'vue-query',
            mock: true,
            headers: true,
            baseUrl: {
                runtime: 'import.meta.env.VITE_API_BASE_URL',
            },
        },
        hooks: {
            afterAllFilesWrite: 'prettier --write',
        },
    },
})
