import { useTranslation } from 'react-i18next'

import ThemedMarkdown from '@components/text/markdown/ThemedMarkdown'
import Accordion from '@components/views/Accordion'
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
    return (
        <Accordion
            label={t(generating ? 'chat.reasoning.generating' : 'chat.reasoning.label')}
            accordionStyle={{
                backgroundColor: color.chat.section.headerBackground,
                borderColor: color.chat.section.border,
                borderWidth: 1,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
            }}
            bodyStyle={{
                backgroundColor: color.chat.section.background,
                borderColor: color.chat.section.border,
            }}
            labelStyle={{ color: color.chat.section.headerText }}
            iconColor={color.chat.section.headerText}
            style={{ flex: 1 }}>
            <ThemedMarkdown streaming={generating}>{content}</ThemedMarkdown>
        </Accordion>
    )
}
export default ChatReasoning
