import { Stack } from 'expo-router'
import { ReactNode } from 'react'

type HeaderButtonProps = {
    headerRight?: () => ReactNode
    headerLeft?: () => ReactNode
}

const HeaderButton: React.FC<HeaderButtonProps> = ({ ...rest }) => {
    return <Stack.Screen options={rest} />
}

export default HeaderButton

