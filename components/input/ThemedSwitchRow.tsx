import { Switch, View } from 'react-native'

import TText from '@components/text/TText'
import { Theme } from '@lib/theme/ThemeManager'

type ThemedSwitchRowProps = {
    label?: string
    description?: string
    value: boolean | undefined
    onChangeValue: (value: boolean) => void
    disabled?: boolean
    divider?: boolean
}

const ThemedSwitchRow = ({
    label,
    description,
    value,
    onChangeValue,
    disabled,
    divider = false,
}: ThemedSwitchRowProps) => {
    const { color } = Theme.useTheme()
    const dimmed = disabled || !value
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: 16,
                paddingVertical: 12,
                opacity: disabled ? 0.5 : 1,
                borderBottomWidth: divider ? 1 : 0,
                borderBottomColor: color.neutral._300,
            }}>
            <View style={{ flex: 1, rowGap: 4 }}>
                {label && (
                    <TText color={dimmed ? '400' : '100'} size={15}>
                        {label}
                    </TText>
                )}
                {description && (
                    <TText color="400" size={12}>
                        {description}
                    </TText>
                )}
            </View>
            <Switch
                accessibilityLabel={label}
                disabled={disabled}
                value={value ?? false}
                onValueChange={onChangeValue}
                trackColor={{ false: color.neutral._300, true: color.primary._300 }}
                thumbColor={value ? color.primary._500 : color.neutral._400}
                ios_backgroundColor={color.neutral._300}
            />
        </View>
    )
}

export default ThemedSwitchRow
