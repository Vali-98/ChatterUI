import { Stack } from 'expo-router'
import { ColorValue } from 'react-native'

type HeaderTitleProps = {
    title?: string
    headerTitle?:
        | string
        | ((props: { children: string; tintColor?: ColorValue | undefined }) => React.ReactNode)
        | undefined
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
