import { useRef, useState } from 'react'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

export const useEdgeFade = (horizontal: boolean, inverted = false) => {
    const metrics = useRef({ offset: 0, content: 0, viewport: 0 })
    const [edges, setEdges] = useState({ start: false, end: false })
    const update = () => {
        const { offset, content, viewport } = metrics.current
        const overflowing = viewport > 0 && content > viewport + 1
        const before = overflowing && offset > 1
        const after = overflowing && content - viewport - offset > 1
        const start = inverted ? after : before
        const end = inverted ? before : after
        setEdges((previous) =>
            previous.start === start && previous.end === end ? previous : { start, end }
        )
    }
    const onLayout = (event: LayoutChangeEvent) => {
        metrics.current.viewport = horizontal
            ? event.nativeEvent.layout.width
            : event.nativeEvent.layout.height
        update()
    }
    const onContentSizeChange = (width: number, height: number) => {
        metrics.current.content = horizontal ? width : height
        update()
    }
    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
        metrics.current = {
            offset: horizontal ? contentOffset.x : contentOffset.y,
            content: horizontal ? contentSize.width : contentSize.height,
            viewport: horizontal ? layoutMeasurement.width : layoutMeasurement.height,
        }
        update()
    }
    return { edges, onLayout, onContentSizeChange, onScroll }
}
