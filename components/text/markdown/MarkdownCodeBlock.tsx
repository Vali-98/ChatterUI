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

const CodeCopyButton = React.memo(function CodeCopyButton({
    content,
    color,
}: {
    content: string
    color?: ColorValue
}) {
    return (
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
    )
})

const MarkdownCodeBlock = ({
    content,
    language,
    headerStyle,
    textStyle,
    children,
}: {
    content: string
    language?: string
    headerStyle: ViewStyle & { color?: ColorValue }
    textStyle: StyleProp<TextStyle>
    children: React.ReactNode
}) => {
    const code = content.endsWith('\n') ? content.slice(0, -1) : content
    return (
        <View>
            <View style={headerStyle}>
                <Text style={{ color: headerStyle.color }}>
                    {language || t('chat.codeBlock.label')}
                </Text>
                {code && <CodeCopyButton content={code} color={headerStyle.color} />}
            </View>
            <Text style={textStyle}>{children}</Text>
        </View>
    )
}

export default MarkdownCodeBlock
