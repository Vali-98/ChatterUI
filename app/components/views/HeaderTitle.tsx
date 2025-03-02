import { Stack } from 'expo-router'

type HeaderTitleProps = {
    title?: string
}

const HeaderTitle: React.FC<HeaderTitleProps> = ({ title = '' }) => {
    return <Stack.Screen options={{ title: title, animation: 'simple_push' }} />
}

export default HeaderTitle
