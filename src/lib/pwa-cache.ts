export async function clearReferenceDataCache(): Promise<boolean> {
    const res = await caches.delete('reference-data')
    return res
}
