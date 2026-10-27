import { contextAllocation, type AllocationItems } from '../lib/utils/contextAllocation'

const items: AllocationItems = {
    system: [{ key: 'system_prompt', tokens: 100 }],
    history: [
        { key: 'messages', tokens: 300 },
        { key: 'summaries', tokens: 150 },
    ],
    reserved: [
        { key: 'response', tokens: 100 },
        { key: 'chatNotes', tokens: 50 },
    ],
}
test('the bar has exactly four groups and includes data-source reservations', () => {
    const allocation = contextAllocation(items, 1000)
    expect(allocation.values).toEqual({ system: 100, history: 450, reserved: 150, free: 300 })
    expect(allocation.used).toBe(550)
    expect(Object.values(allocation.values).reduce((sum, value) => sum + value, 0)).toBe(1000)
})
test('opportunistic limits do not reduce free space', () => {
    const allocation = contextAllocation(items, 1000, [{ key: 'lorebooks', tokens: 500 }])
    expect(allocation.free).toBe(300)
    expect(allocation.opportunistic[0].tokens).toBe(500)
})
test('changing the reservation immediately changes free space', () => {
    expect(
        contextAllocation({ ...items, reserved: [{ key: 'response', tokens: 300 }] }, 1000).free
    ).toBe(150)
})
test('overflow keeps four groups without negative free space', () => {
    const allocation = contextAllocation(items, 500)
    expect(allocation.free).toBe(0)
    expect(allocation.overflow).toBe(200)
    expect(
        Object.values(allocation.values).reduce((sum, value) => sum + value, 0) /
            allocation.denominator
    ).toBe(1)
})
test('zero capacity never produces invalid segment widths', () => {
    const allocation = contextAllocation({ system: [], history: [], reserved: [] }, 0)
    expect(allocation.denominator).toBe(1)
    expect(allocation.free).toBe(0)
})
