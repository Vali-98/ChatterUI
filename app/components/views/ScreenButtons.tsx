import { Stack } from 'expo-router'
import { ReactNode } from 'react'
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types'

type HeaderButtonProps = {
    headerRight?: () => ReactNode
    headerLeft?: () => ReactNode
}

const HeaderButton: React.FC<HeaderButtonProps> = ({ headerRight, headerLeft }) => {
    return <Stack.Screen options={{ headerRight: headerRight, headerLeft: headerLeft }} />
}

export default HeaderButton
