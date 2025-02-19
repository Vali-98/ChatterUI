import { Stack } from 'expo-router'
import { ReactNode } from 'react'
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types'

type HeaderButtonProps = {
    headerRight?: () => ReactNode
    headerLeft?: () => ReactNode
}

const HeaderButton: React.FC<HeaderButtonProps> = ({ ...rest }) => {
    return <Stack.Screen options={rest} />
}

export default HeaderButton
