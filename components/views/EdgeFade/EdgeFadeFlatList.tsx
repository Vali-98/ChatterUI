import type { Ref } from 'react'
import { FlatList, type FlatListProps, type StyleProp, View, type ViewStyle } from 'react-native'

import EdgeFades, { type EdgeFadeOptions } from './EdgeFades'
import { useEdgeFade } from './useEdgeFade'

export type EdgeFadeFlatListProps<Item> = FlatListProps<Item> &
    EdgeFadeOptions & {
        ref?: Ref<FlatList<Item>>
        containerStyle?: StyleProp<ViewStyle>
    }

const EdgeFadeFlatList = <Item,>({
    edgeLength,
    edgeColour,
    containerStyle,
    horizontal = false,
    inverted = false,
    onLayout,
    onScroll,
    onContentSizeChange,
    scrollEventThrottle = 16,
    ...props
}: EdgeFadeFlatListProps<Item>) => {
    const fade = useEdgeFade(!!horizontal, !!inverted)
    return (
        <View style={containerStyle}>
            <FlatList
                {...props}
                horizontal={horizontal}
                inverted={inverted}
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
export default EdgeFadeFlatList
