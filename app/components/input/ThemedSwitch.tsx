import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { Switch, Text, View } from 'react-native'

interface ThemedSwitchProps {
    description?: string
    label?: string
    value: boolean | undefined
    onChangeValue: (b: boolean) => void
}

const ThemedSwitch: React.FC<ThemedSwitchProps> = ({
    description,
    label,
    value,
    onChangeValue,
}) => {
    const { color, spacing } = Theme.useTheme()
    return (
        <View>
            <View
                style={{ flexDirection: 'row', paddingVertical: spacing.m, alignItems: 'center' }}>
                <Switch
                    trackColor={{
                        false: color.neutral._300,
                        true: color.neutral._500,
                    }}
                    thumbColor={value ? color.primary._500 : color.neutral._400}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={onChangeValue}
                    value={value}
                />
                {label && (
                    <Text
                        style={{
                            marginLeft: spacing.xl,
                            color: value ? color.text._100 : color.text._300,
                        }}>
                        {label}
                    </Text>
                )}
            </View>
            {description && (
                <Text
                    style={{
                        color: color.text._400,
                        paddingBottom: spacing.xs,
                        marginBottom: spacing.m,
                    }}>
                    {description}
                </Text>
            )}
        </View>
    )
}

export default ThemedSwitch
