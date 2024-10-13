import { ReactNode } from 'react'
import { GestureResponderEvent, TouchableOpacity } from 'react-native'

type FadeScreenProps = {
    handleOverlayClick?: (e: GestureResponderEvent) => void
    children: ReactNode
}

const FadeBackrop: React.FC<FadeScreenProps> = ({ handleOverlayClick, children }) => {
    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={handleOverlayClick}
            style={{
                height: '100%',
                justifyContent: 'flex-end',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}>
            {children}
        </TouchableOpacity>
    )
}

export default FadeBackrop
