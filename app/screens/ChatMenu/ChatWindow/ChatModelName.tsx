import { Ionicons } from '@expo/vector-icons'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Theme } from '@lib/theme/ThemeManager'
import { useRouter } from 'expo-router'
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'

const ChatModelName = () => {
    const model = Llama.useLlama((state) => state.model)
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
                {model ? model.name : 'No Model Loaded'}
            </Text>
            <TouchableOpacity
                onPress={() => router.push('/screens/ModelManager')}
                style={{ paddingLeft: spacing.xl2, paddingVertical: spacing.m }}>
                <Ionicons name="caret-forward" color={color.primary._500} size={18} />
            </TouchableOpacity>
        </View>
    )
}

export default ChatModelName
