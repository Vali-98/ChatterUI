export type SpotlightPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center'
export type SpotlightPlacementOptions = {
    placement?: SpotlightPlacement
    gap?: number
    allowOverlap?: boolean
}
export type SpotlightRect = { x: number; y: number; width: number; height: number }

type PlacementInput = {
    target: SpotlightRect
    viewport: {
        width: number
        height: number
        topInset: number
        bottomInset: number
        leftInset?: number
        rightInset?: number
    }
    bubbleHeight: number
} & SpotlightPlacementOptions

export const getSpotlightPlacement = ({
    target,
    viewport,
    bubbleHeight,
    placement = 'auto',
    gap = 16,
    allowOverlap = false,
}: PlacementInput): SpotlightRect => {
    const left = (viewport.leftInset ?? 0) + 24
    const right = viewport.width - (viewport.rightInset ?? 0) - 24
    const top = viewport.topInset + 16
    const bottom = viewport.height - viewport.bottomInset - 16
    const fullWidth = Math.max(0, right - left)
    const height = Math.min(bubbleHeight, Math.max(0, bottom - top))
    if (placement === 'center') {
        return { x: left, y: top + (bottom - top - height) / 2, width: fullWidth, height }
    }
    const space = {
        top: target.y - gap - top,
        bottom: bottom - target.y - target.height - gap,
        left: target.x - gap - left,
        right: right - target.x - target.width - gap,
    }
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const
    const candidates =
        placement === 'auto'
            ? (['bottom', 'top', 'right', 'left'] as const)
            : ([placement, opposite[placement], 'bottom', 'top', 'right', 'left'] as const)
    const side =
        (allowOverlap && placement !== 'auto' ? placement : undefined) ??
        candidates.find((candidate) =>
            candidate === 'left' || candidate === 'right'
                ? space[candidate] >= Math.min(260, fullWidth)
                : space[candidate] >= height
        ) ??
        (space.bottom >= space.top ? 'bottom' : 'top')
    const width =
        side === 'left' || side === 'right'
            ? Math.min(fullWidth, Math.max(Math.min(260, fullWidth), space[side]))
            : fullWidth
    let x = left
    let y = target.y + target.height + gap
    if (side === 'top') y = target.y - gap - height
    if (side === 'left') {
        x = target.x - gap - width
        y = target.y + (target.height - height) / 2
    }
    if (side === 'right') {
        x = target.x + target.width + gap
        y = target.y + (target.height - height) / 2
    }
    return {
        x: Math.max(left, Math.min(x, right - width)),
        y: Math.max(top, Math.min(y, bottom - height)),
        width,
        height,
    }
}
