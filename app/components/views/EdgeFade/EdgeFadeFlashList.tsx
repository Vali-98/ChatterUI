import { FlashList, type FlashListProps, type FlashListRef } from '@shopify/flash-list'
import type { Ref } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import EdgeFades, { type EdgeFadeOptions } from './EdgeFades'
import { useEdgeFade } from './useEdgeFade'

export type EdgeFadeFlashListProps<Item> = FlashListProps<Item> &
    EdgeFadeOptions & {
        ref?: Ref<FlashListRef<Item>>
        containerStyle?: StyleProp<ViewStyle>
    }

const EdgeFadeFlashList = <Item,>({
    edgeLength,
    edgeColour,
    containerStyle,
    horizontal = false,
    onLayout,
    onScroll,
    onContentSizeChange,
    scrollEventThrottle = 16,
    ...props
}: EdgeFadeFlashListProps<Item>) => {
    const fade = useEdgeFade(!!horizontal)
    return (
        <View style={[!horizontal && { flex: 1 }, containerStyle]}>
            <FlashList
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
export default EdgeFadeFlashList
