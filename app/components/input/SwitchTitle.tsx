import { Style } from '@lib/utils/Global'
import React from 'react'
import { Switch, Text, View } from 'react-native'

export interface SwitchTitleProps {
    title?: string
    value: boolean | undefined
    onValueChange: (b: boolean) => void | Promise<void> | undefined
}

const SwitchComponent: React.FC<SwitchTitleProps> = ({ title, value, onValueChange }) => {
    return (
        <View style={{ flexDirection: 'row', paddingVertical: 12 }}>
            <Switch
                trackColor={{
                    false: Style.getColor('primary-surface2'),
                    true: Style.getColor('primary-surface3'),
                }}
                thumbColor={
                    value ? Style.getColor('primary-brand') : Style.getColor('primary-surface3')
                }
                ios_backgroundColor="#3e3e3e"
                onValueChange={onValueChange}
                value={value}
            />
            {title && (
                <Text
                    style={{
                        marginLeft: 16,
                        color: Style.getColor(value ? 'primary-text1' : 'primary-text3'),
                    }}>
                    {title}
                </Text>
            )}
        </View>
    )
}

export default SwitchComponent
