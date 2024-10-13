import React, { useEffect, useState } from 'react'
import { Image, ImageProps, ImageSourcePropType, StyleSheet } from 'react-native'

interface FallbackImageProps extends Omit<ImageProps, 'source' | 'onError'> {
    targetImage: string
}

const Avatar: React.FC<FallbackImageProps> = ({ targetImage, ...rest }) => {
    const fallbackImage = require('@assets/user.png')

    const [imageSource, setImageSource] = useState<ImageSourcePropType>({ uri: targetImage })
    useEffect(() => {
        setImageSource({ uri: targetImage })
    }, [targetImage])

    const handleError = () => {
        setImageSource(fallbackImage)
    }

    return <Image source={imageSource} onError={handleError} {...rest} />
}

export default Avatar
