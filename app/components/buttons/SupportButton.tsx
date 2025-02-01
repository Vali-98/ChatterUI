import { FontAwesome } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { Linking, Text, TouchableOpacity } from 'react-native'

const SupportButton = () => {
    const theme = Theme.useTheme()

    return (
        <TouchableOpacity
            onPress={() => {
                Linking.openURL('https://ko-fi.com/vali98')
            }}
            style={{
                alignSelf: 'center',
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderColor: theme.color.primary._500,
                padding: 8,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderRadius: 16,
            }}>
            <Text style={{ color: theme.color.text._400, paddingRight: 4 }}>Support ChatterUI</Text>
            <FontAwesome name="coffee" size={16} color={theme.color.text._100} />
        </TouchableOpacity>
    )
}

export default SupportButton
