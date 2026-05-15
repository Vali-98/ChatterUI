import { useTranslation } from 'react-i18next'
import { View, Text } from 'react-native'
import { Bar } from 'react-native-progress'

import { SamplerID } from '@lib/constants/SamplerData'
import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
import { Chats } from '@lib/state/Chat'
import { SamplersManager } from '@lib/state/SamplerState'
import { Theme } from '@lib/theme/ThemeManager'

const ChatTokenCount: React.FC = () => {
    const { t } = useTranslation()
    const { id: chatId } = Chats.useChatState()
    const { data } = useLiveQueryJoined(Chats.db.live.tokenCount(chatId ?? -1))
    const { color, fontSize } = Theme.useTheme()
    const sampler = SamplersManager.useCurrentSampler()
    const tokenCount = parseFloat(data?.[0]?.totalTokens ?? '0')
    const maxLength = sampler?.data?.[SamplerID.CONTEXT_LENGTH] ?? 1
    const progress = Math.min(1, Math.max(0, tokenCount / maxLength))
    const leftover = maxLength - tokenCount
    const warning = leftover < Math.min(2048, 0.25 * maxLength)
    const genLengthColor = warning ? color.error._300 : color.primary._500
    return (
        <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            <Text style={{ color: color.text._100, paddingBottom: 8, marginLeft: 4 }}>
                {t('chat.tokencount.title')}
            </Text>
            <Bar
                style={{ borderWidth: 2, backgroundColor: color.neutral._100 }}
                progress={progress}
                color={genLengthColor}
                borderColor={color.neutral._300}
                height={12}
                borderRadius={12}
                width={null}
            />
            <Text style={{ color: color.text._400, fontSize: fontSize.s, marginLeft: 4 }}>
                {t('chat.tokencount.used', { max: maxLength, used: tokenCount })}
            </Text>
        </View>
    )
}

export default ChatTokenCount
