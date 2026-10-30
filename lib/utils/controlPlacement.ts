export type ControlBounds = { top: number; bottom: number; left: number; right: number }

export const placeChatControl = (
    message: ControlBounds,
    viewport: ControlBounds,
    size: { width: number; height: number },
    reservedBottom: number
) => {
    'worklet'
    const height = Math.max(0, viewport.bottom - viewport.top)
    const width = Math.max(0, viewport.right - viewport.left)
    return {
        visible:
            height >= size.height + reservedBottom &&
            width > 0 &&
            message.bottom > viewport.top &&
            message.top < viewport.bottom,
        top: Math.max(
            0,
            Math.min(
                message.bottom - viewport.top - size.height,
                height - reservedBottom - size.height
            )
        ),
        right: 12,
    }
}

/** Lift the floating column only when its default player position meets the swipe bar. */
export const getChatControlLift = (
    player: { top: number; bottom: number },
    swipes: { top: number; bottom: number } | null,
    gap: number
) => {
    'worklet'
    if (!swipes || swipes.bottom <= player.top - gap || swipes.top >= player.bottom + gap) return 0
    return Math.max(0, player.bottom - swipes.top + gap)
}
