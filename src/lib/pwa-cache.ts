export async function clearReferenceDataCache() {
    await caches.delete('reference-data')
}
