import { setStringAsync } from 'expo-clipboard'
import { t } from 'i18next'
import React from 'react'
import {
    Text,
    View,
    type ColorValue,
    type StyleProp,
    type TextStyle,
    type ViewStyle,
} from 'react-native'

import IconButton from '@components/buttons/IconButton'
import { Logger } from '@lib/state/Logger'

const CodeCopyButton = React.memo(({ content, color }: { content: string; color?: ColorValue }) => (
    <IconButton
        iconName="copy"
        variant="tertiary"
        iconStyle={{ color }}
        onPress={() => {
            setStringAsync(content)
                .then(() => {
                    Logger.infoToast(t('chat.quickActions.toast.copiedCode'))
                })
                .catch(() => {
                    Logger.errorToast(t('chat.quickActions.toast.copyFailed'))
                })
        }}
    />
))

const MarkdownCodeBlock = ({
    content,
    language,
    headerStyle,
    textStyle,
}: {
    content: string
    language?: string
    headerStyle: ViewStyle & { color?: ColorValue }
    textStyle: StyleProp<TextStyle>
}) => {
    const code = content.endsWith('\n') ? content.slice(0, -1) : content
    return (
        <View>
            <View style={headerStyle}>
                <Text style={{ color: headerStyle.color }}>{language || 'Code'}</Text>
                {code && <CodeCopyButton content={code} color={headerStyle.color} />}
            </View>
            <Text style={textStyle}>{code}</Text>
        </View>
    )
}

export default MarkdownCodeBlock
