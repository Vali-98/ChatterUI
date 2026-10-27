export type AllocationItem = { key: string; tokens: number; label?: string }
export type AllocationItems = {
    system: AllocationItem[]
    history: AllocationItem[]
    reserved: AllocationItem[]
}

export const contextAllocation = (
    items: AllocationItems,
    capacity: number,
    opportunistic: AllocationItem[] = []
) => {
    const sum = (values: AllocationItem[]) =>
        values.reduce((total, item) => total + Math.max(0, item.tokens), 0)
    const system = sum(items.system)
    const history = sum(items.history)
    const reserved = sum(items.reserved)
    const used = system + history
    const limit = Math.max(0, capacity)
    const free = Math.max(0, limit - used - reserved)
    return {
        values: { system, history, reserved, free },
        items: items,
        opportunistic: opportunistic,
        used: used,
        reserved: reserved,
        free: free,
        capacity: limit,
        overflow: Math.max(0, used + reserved - limit),
        denominator: Math.max(limit, used + reserved, 1),
    }
}
export type ContextAllocation = ReturnType<typeof contextAllocation>
