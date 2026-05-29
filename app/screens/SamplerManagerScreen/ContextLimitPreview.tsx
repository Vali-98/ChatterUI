import AntDesign from '@react-native-vector-icons/ant-design/static'
import MaterialIcons from '@react-native-vector-icons/material-icons/static'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import * as Progress from 'react-native-progress'

import { useContextLimit } from '@lib/hooks/ContextLimit'
import { Theme } from '@lib/theme/ThemeManager'

interface ContextLimitPreviewProps {
    generatedLength: number
}

const ContextLimitPreview: React.FC<ContextLimitPreviewProps> = ({ generatedLength }) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const contextLimit = useContextLimit()
    const leftover = Math.max(0, contextLimit - generatedLength)
    const limit = leftover / contextLimit
    const warning = leftover < Math.min(2048, 0.25 * contextLimit)
    const genLengthColor = warning ? color.error._300 : color.primary._200

    return (
        <View
            style={{
                borderRadius: 8,
                padding: 12,
                marginHorizontal: 4,
                rowGap: 8,
                borderWidth: 2,
                borderColor: color.primary._200,
            }}>
            <Text style={{ color: color.text._100 }}>
                {t('contextlimit.allocation')}{' '}
                <Text style={{ color: color.text._400 }}>({contextLimit})</Text>
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
            <View style={{ flexDirection: 'row', columnGap: 4, alignItems: 'center' }}>
                {warning ? (
                    <AntDesign
                        name={'exclamation-circle'}
                        size={16}
                        style={{
                            color: color.error._400,
                        }}
                    />
                ) : (
                    <MaterialIcons
                        name="circle"
                        size={16}
                        style={{
                            color: color.primary._400,
                        }}
                    />
                )}
                <Text style={{ color: color.text._400, textAlign: 'center' }}>
                    {t('contextlimit.chat')}: {leftover}
                </Text>
                <MaterialIcons
                    name="circle"
                    size={16}
                    style={{
                        color: genLengthColor,
                        marginLeft: 12,
                    }}
                />
                <Text style={{ color: color.text._400, textAlign: 'center' }}>
                    {t('contextlimit.generated')}: {generatedLength}
                </Text>
            </View>
            {warning && (
                <Text style={{ color: color.error._300 }}>{t('contextlimit.warning')}</Text>
            )}
        </View>
    )
}

export default ContextLimitPreview
