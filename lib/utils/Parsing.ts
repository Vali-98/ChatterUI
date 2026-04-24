export const getNestedValue = (obj: any, path: string | string[]) => {
    if (Array.isArray(path)) {
        for (const p of path) {
            const value = parseSingle(obj, p)
            if (value) return value
        }
    } else {
        const value = parseSingle(obj, path)
        if (value) return value
    }
    return null
}

const parseSingle = (obj: any, path: string) => {
    if (path === '') return obj
    const keys = path.split('.')
    const value = keys.reduce((acc, key) => acc?.[key], obj)
    return value ?? null
}
