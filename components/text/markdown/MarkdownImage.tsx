import { Image } from 'expo-image'
import { useState } from 'react'
import { useWindowDimensions, View, type StyleProp, type ImageStyle } from 'react-native'

const MarkdownImage = ({
    source,
    alt,
    style,
}: {
    source: string
    alt?: string
    style: StyleProp<ImageStyle>
}) => {
    const [size, setSize] = useState({ width: 0, height: 0 })
    const { width } = useWindowDimensions()
    const imageWidth = Math.min(Math.max(0, width - 100), size.width)
    const imageHeight = size.width > 0 ? (imageWidth * size.height) / size.width : 0
    return (
        <View style={{ height: imageHeight }}>
            <Image
                source={{ uri: source }}
                style={[style, { width: imageWidth, height: imageHeight }]}
                accessibilityLabel={alt}
                onLoad={({ source: image }) =>
                    setSize({ width: image.width, height: image.height })
                }
                contentFit="contain"
            />
        </View>
    )
}

export default MarkdownImage
