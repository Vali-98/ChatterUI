import { useTranslation } from 'react-i18next'
import Markdown from 'react-native-markdown-display'

import Accordion from '@components/views/Accordion'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { Theme } from '@lib/theme/ThemeManager'

const ChatReasoning = ({
    content,
    generating = false,
}: {
    content: string
    generating?: boolean
}) => {
    const { color } = Theme.useTheme()
    const { t } = useTranslation()
    const { markdown, rules, style } = MarkdownStyle.useCustomFormatting()
    return (
        <Accordion
            label={t(generating ? 'chat.reasoning.generating' : 'chat.reasoning.label')}
            accordionStyle={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
            }}
            bodyStyle={{ borderWidth: 0 }}
            labelStyle={{ color: color.text._400 }}
            style={{ flex: 1 }}>
            <Markdown mergeStyle={false} markdownit={markdown} rules={rules} style={style}>
                {content}
            </Markdown>
        </Accordion>
    )
}
export default ChatReasoning
