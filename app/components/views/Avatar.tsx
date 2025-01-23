import { Image, ImageProps } from 'expo-image'

interface FallbackImageProps extends Omit<ImageProps, 'source' | 'onError'> {
    targetImage: string
}

const Avatar: React.FC<FallbackImageProps> = ({ targetImage, ...rest }) => {
    const fallbackImage = require('@assets/user.png')

    return (
        <Image
            {...rest}
            source={{ uri: targetImage }}
            placeholder={fallbackImage}
            cachePolicy="none"
        />
    )
}

export default Avatar
