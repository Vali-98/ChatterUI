import { Image } from 'expo-image'
import { useState } from 'react'
import { useWindowDimensions, View, type StyleProp, type ImageStyle } from 'react-native'
import type { ASTNode } from 'react-native-markdown-display'

const MarkdownImage = ({
    node,
    style,
    allowedImageHandlers,
    defaultImageHandler,
}: {
    node: ASTNode
    style: StyleProp<ImageStyle>
    allowedImageHandlers: string[]
    defaultImageHandler: string | null
}) => {
    const [imageData, setImageData] = useState({ height: 0, aspectRatio: 1 })
    const { src, alt } = node.attributes

    const { width } = useWindowDimensions()
    // we check that the source starts with at least one of the elements in allowedImageHandlers
    const show =
        allowedImageHandlers.filter((value: string) => {
            return src.toLowerCase().startsWith(value.toLowerCase())
        }).length > 0

    if (show === false && defaultImageHandler === null) {
        return null
    }

    const imageProps: any = {
        indicator: true,
        style,
        source: { uri: src },
    }

    if (alt) {
        imageProps.accessible = true
        imageProps.accessibilityLabel = alt
    }

    return (
        <View style={{ height: imageData.height }}>
            <Image
                key={node.key}
                {...imageProps}
                width={imageData.height}
                aspectRatio={imageData.aspectRatio}
                onLoad={(data) => {
                    setImageData({
                        height: Math.min(width - 100, data.source.width),
                        aspectRatio: data.source.width / data.source.height,
                    })
                }}
                contentFit="contain"
            />
        </View>
    )
}

export default MarkdownImage
