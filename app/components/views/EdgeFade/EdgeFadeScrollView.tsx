import type { Ref } from 'react'
import {
    ScrollView,
    type ScrollViewProps,
    type StyleProp,
    View,
    type ViewStyle,
} from 'react-native'

import EdgeFades, { type EdgeFadeOptions } from './EdgeFades'
import { useEdgeFade } from './useEdgeFade'

export type EdgeFadeScrollViewProps = ScrollViewProps &
    EdgeFadeOptions & {
        ref?: Ref<ScrollView>
        containerStyle?: StyleProp<ViewStyle>
    }

const EdgeFadeScrollView = ({
    edgeLength,
    edgeColour,
    containerStyle,
    horizontal = false,
    onLayout,
    onScroll,
    onContentSizeChange,
    scrollEventThrottle = 16,
    ...props
}: EdgeFadeScrollViewProps) => {
    const fade = useEdgeFade(!!horizontal)
    return (
        <View style={[!horizontal && { flex: 1 }, containerStyle]}>
            <ScrollView
                {...props}
                horizontal={horizontal}
                scrollEventThrottle={scrollEventThrottle}
                onLayout={(event) => {
                    fade.onLayout(event)
                    onLayout?.(event)
                }}
                onScroll={(event) => {
                    fade.onScroll(event)
                    onScroll?.(event)
                }}
                onContentSizeChange={(width, height) => {
                    fade.onContentSizeChange(width, height)
                    onContentSizeChange?.(width, height)
                }}
            />
            <EdgeFades
                horizontal={!!horizontal}
                edges={fade.edges}
                edgeLength={edgeLength}
                edgeColour={edgeColour}
            />
        </View>
    )
}
export default EdgeFadeScrollView
