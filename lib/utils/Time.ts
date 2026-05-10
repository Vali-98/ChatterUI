const day_ms = 86400000
export const getFriendlyTimeStamp = (oldtime: number) => {
    const now = Date.now()
    const delta = now - oldtime
    if (delta < now % day_ms) return new Date(oldtime).toLocaleTimeString()
    if (delta < (now % day_ms) + day_ms) return 'Yesterday'
    return new Date(oldtime).toLocaleDateString()
}

export async function benchmark<T>(fn: () => T | Promise<T>) {
    console.log('[Start Benchmark]')
    const start = performance.now()
    const result = await fn()
    console.log('[End Benchmark]', performance.now() - start)
    return result
}
