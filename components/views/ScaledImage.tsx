import { Image, ImageProps } from 'expo-image'
import { useEffect, useState } from 'react'
import { Image as RNImage } from 'react-native'

interface ScaledImageProps extends Omit<ImageProps, 'source'> {
    uri: string
}

const ScaledImage: React.FC<ScaledImageProps> = ({ uri, style, ...props }) => {
    const [aspectRatio, setAspectRatio] = useState(1)
    useEffect(() => {
        RNImage.getSize(
            uri,
            (width, height) => {
                setAspectRatio(width / height)
            },
            () => {
                setAspectRatio(1)
            }
        )
    }, [uri])
    return <Image {...props} source={{ uri }} style={[{ aspectRatio }, style]} />
}

export default ScaledImage
