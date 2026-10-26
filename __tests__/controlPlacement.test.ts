import { placeChatControl, getChatControlLift } from '../lib/utils/controlPlacement'

const viewport = { top: 100, bottom: 700, left: 0, right: 400 }
const size = { width: 260, height: 44 }
test('actions follow the message bottom while there is room', () => {
    expect(
        placeChatControl({ top: 120, bottom: 300, left: 0, right: 400 }, viewport, size, 4)
    ).toMatchObject({ visible: true, top: 156, right: 12 })
})
test('a tall message pins actions above the player reservation', () => {
    const position = placeChatControl(
        { top: -500, bottom: 1600, left: 0, right: 400 },
        viewport,
        size,
        80
    )
    expect(position.visible).toBe(true)
    expect(position.top + size.height).toBe(520)
})
test('messages above or below the viewport hide their controls', () => {
    expect(
        placeChatControl({ top: 0, bottom: 100, left: 0, right: 400 }, viewport, size, 4).visible
    ).toBe(false)
    expect(
        placeChatControl({ top: 700, bottom: 900, left: 0, right: 400 }, viewport, size, 4).visible
    ).toBe(false)
})
test('narrow messages retain the shared right margin', () => {
    expect(
        placeChatControl({ top: 120, bottom: 300, left: 0, right: 100 }, viewport, size, 4).right
    ).toBe(12)
})
test('controls hide when the available viewport cannot fit both controls', () => {
    expect(
        placeChatControl(
            { top: 0, bottom: 900, left: 0, right: 400 },
            { ...viewport, bottom: 180 },
            size,
            80
        ).visible
    ).toBe(false)
})

test('the column clears an overlapping swipe bar without moving chat content', () => {
    expect(getChatControlLift({ top: 600, bottom: 638 }, { top: 620, bottom: 660 }, 8)).toBe(26)
})
test('the column stays at its default position when swipes are elsewhere or absent', () => {
    const player = { top: 600, bottom: 638 }
    expect(getChatControlLift(player, { top: 400, bottom: 440 }, 8)).toBe(0)
    expect(getChatControlLift(player, { top: 660, bottom: 700 }, 8)).toBe(0)
    expect(getChatControlLift(player, null, 8)).toBe(0)
})
test('the column also preserves its gap when the swipe bar is just below it', () => {
    expect(getChatControlLift({ top: 600, bottom: 638 }, { top: 640, bottom: 680 }, 8)).toBe(6)
})
