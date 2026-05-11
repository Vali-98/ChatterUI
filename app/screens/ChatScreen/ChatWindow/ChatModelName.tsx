import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, TouchableOpacity } from 'react-native'

import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Theme } from '@lib/theme/ThemeManager'

const ChatModelName = () => {
    const { t } = useTranslation()
    const model = Llama.useLlamaModelStore((state) => state.model)
    const { color, spacing, borderRadius } = Theme.useTheme()

    const router = useRouter()
    return (
        <View
            style={{
                marginVertical: spacing.s,
                marginHorizontal: spacing.xl,
                backgroundColor: color.neutral._200,
                borderRadius: borderRadius.m,
                paddingHorizontal: spacing.xl,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
            <Text
                numberOfLines={1}
                style={{
                    overflow: 'hidden',
                    flex: 1,
                    color: model ? color.primary._700 : color.text._400,
                }}>
                {model ? model.name : t('chat.modelName.noModelLoaded')}
            </Text>
            <TouchableOpacity
                onPress={() => router.push('/screens/ModelManagerScreen')}
                style={{ paddingLeft: spacing.xl2, paddingVertical: spacing.m }}>
                <Ionicons name="caret-forward" color={color.primary._500} size={18} />
            </TouchableOpacity>
        </View>
    )
}

export default ChatModelName
