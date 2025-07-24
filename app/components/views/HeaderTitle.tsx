import { Stack } from 'expo-router'
import { ReactNode } from 'react'

type HeaderTitleProps = {
    title?: string
    headerTitle?: ((props: { children: string; tintColor?: string }) => ReactNode) | undefined
}

const HeaderTitle: React.FC<HeaderTitleProps> = ({ title = '', headerTitle = undefined }) => {
    return (
        <Stack.Screen
            options={{
                title: title,
                headerTitle: headerTitle,
                animation: 'simple_push',
            }}
        />
    )
}

export default HeaderTitle
