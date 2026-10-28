import { getSpotlightPlacement } from '../lib/guides/placement'

const viewport = { width: 400, height: 800, topInset: 24, bottomInset: 20 }

test('a bottom-right control gets a bubble above it', () => {
    const target = { x: 340, y: 700, width: 40, height: 40 }
    const result = getSpotlightPlacement({ target, viewport, bubbleHeight: 180 })
    expect(result.y + result.height).toBeLessThan(target.y)
})

test.each(['top', 'bottom'] as const)('honours %s placement when it fits', (placement) => {
    const target = { x: 160, y: 350, width: 60, height: 50 }
    const result = getSpotlightPlacement({
        target,
        viewport,
        bubbleHeight: 120,
        placement,
        gap: 20,
    })
    expect(
        placement === 'top'
            ? target.y - result.y - result.height
            : result.y - target.y - target.height
    ).toBe(20)
})

test.each(['left', 'right'] as const)(
    'supports %s placement with a constrained width',
    (placement) => {
        const target = { x: 500, y: 300, width: 80, height: 80 }
        const result = getSpotlightPlacement({
            target,
            viewport: { ...viewport, width: 1100 },
            bubbleHeight: 160,
            placement,
        })
        expect(result.width).toBeGreaterThanOrEqual(260)
        expect(
            placement === 'left'
                ? result.x + result.width <= target.x - 16
                : result.x >= target.x + target.width + 16
        ).toBe(true)
    }
)

test('an unavailable side falls back rather than covering the target', () => {
    const target = { x: 10, y: 300, width: 80, height: 80 }
    const result = getSpotlightPlacement({ target, viewport, bubbleHeight: 160, placement: 'left' })
    expect(result.x).toBeGreaterThanOrEqual(target.x + target.width + 16)
})

test('a large target and oversized bubble stay within safe screen bounds', () => {
    const result = getSpotlightPlacement({
        target: { x: 0, y: 80, width: 400, height: 650 },
        viewport,
        bubbleHeight: 1200,
    })
    expect(result.y).toBeGreaterThanOrEqual(viewport.topInset + 16)
    expect(result.y + result.height).toBeLessThanOrEqual(
        viewport.height - viewport.bottomInset - 16
    )
})

test('overlap keeps an explicit bottom placement at the bottom of a full-height target', () => {
    const result = getSpotlightPlacement({
        target: { x: 0, y: 80, width: 400, height: 650 },
        viewport,
        bubbleHeight: 160,
        placement: 'bottom',
        allowOverlap: true,
    })
    expect(result.y + result.height).toBe(viewport.height - viewport.bottomInset - 16)
})

test('an untargeted message centers within the safe viewport', () => {
    const result = getSpotlightPlacement({
        target: { x: 0, y: 0, width: 0, height: 0 },
        viewport,
        bubbleHeight: 160,
        placement: 'center',
    })
    expect(result.y + result.height / 2).toBe(
        (viewport.topInset + viewport.height - viewport.bottomInset) / 2
    )
})
