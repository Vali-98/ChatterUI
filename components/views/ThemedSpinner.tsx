import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

const ThemedSpinner = (props: ActivityIndicatorProps) => {
    const { color } = Theme.useTheme()
    return <ActivityIndicator size="small" color={color.primary._400} {...props} />
}
export default ThemedSpinner
