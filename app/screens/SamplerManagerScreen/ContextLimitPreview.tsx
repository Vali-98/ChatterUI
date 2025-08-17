import { View, Text } from 'react-native'
import React from 'react'
import { useContextLimit } from '@lib/hooks/ContextLimit'
import { Theme } from '@lib/theme/ThemeManager'
import * as Progress from 'react-native-progress'
import { AntDesign, FontAwesome } from '@expo/vector-icons'

interface ContextLimitPreviewProps {
    generatedLength: number
}

const ContextLimitPreview: React.FC<ContextLimitPreviewProps> = ({ generatedLength }) => {
    const { color } = Theme.useTheme()
    const contextLimit = useContextLimit()
    const leftover = Math.max(0, contextLimit - generatedLength)
    const limit = leftover / contextLimit
    const genLengthColor =
        limit > 0.66 ? color.primary._200 : limit > 0.35 ? color.quote : color.error._300

    return (
        <View style={{ marginHorizontal: 16, marginVertical: 12, rowGap: 8 }}>
            <Text style={{ color: color.text._100 }}>
                Context Allocation <Text style={{ color: color.text._400 }}>({contextLimit})</Text>
            </Text>
            <Progress.Bar
                progress={limit}
                color={color.primary._400}
                borderColor={color.neutral._300}
                height={12}
                unfilledColor={genLengthColor}
                borderRadius={12}
                width={null}
            />
            <View style={{ flexDirection: 'row', columnGap: 24 }}>
                <Text style={{ color: color.text._400 }}>
                    <FontAwesome
                        name="circle"
                        style={{
                            color: color.neutral._300,
                        }}
                    />{' '}
                    Chat Context: {leftover}
                </Text>
                <Text style={{ color: color.text._400 }}>
                    <FontAwesome
                        name="circle"
                        style={{
                            color: genLengthColor,
                        }}
                    />{' '}
                    Generated: {generatedLength}
                </Text>
            </View>
        </View>
    )
}

export default ContextLimitPreview
