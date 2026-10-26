import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { ChatMessage } from '@lib/state/chat'
import { useChatActionsState } from '@lib/state/components/ChatControls'
import { Theme } from '@lib/theme/ThemeManager'

import { useMessageActionAnchor } from './ChatActionAnchor'
import ChatAttachments from './ChatAttachments'
import { useChatEditorStore } from './ChatEditor'
import ChatSwipes from './ChatSwipes'
import ChatText from './ChatText'
import ChatTextLast from './ChatTextLast'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type ChatTextProps = {
    index: number
    isGenerating: boolean
    isLastMessage: boolean
    isGreeting: boolean
    entry: ChatMessage
}

const ChatBubble: React.FC<ChatTextProps> = ({
    index,
    isGenerating,
    entry,
    isLastMessage,
    isGreeting,
}) => {
    const anchorRef = useMessageActionAnchor(entry.id)
    const { t } = useTranslation()
    const { appMode } = useAppMode()
    const [showTPS] = useMMKVBoolean(AppSettings.ShowTokenPerSecond)
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    const { setShowOptions } = useChatActionsState(
        useShallow((state) => ({
            setShowOptions: state.setActiveIndex,
        }))
    )

    const showEditor = useChatEditorStore((state) => state.show)
    const handleEnableEdit = () => {
        if (!isGenerating) showEditor(entry.id)
    }

    const swipe = entry.swipes[0]
    if (!entry || !swipe) return

    const showSwipe = !entry.is_user && isLastMessage
    const timings = swipe.timings
    const bubbleColor = entry.is_user ? color.neutral._200 : color.neutral._200
    return (
        <View>
            <AnimatedPressable
                ref={anchorRef}
                collapsable={false}
                onPress={() => {
                    setShowOptions(isGenerating ? undefined : entry.id, entry)
                }}
                style={{
                    backgroundColor: bubbleColor,
                    borderColor: color.neutral._200,
                    borderWidth: 1,
                    marginBottom: showSwipe ? 0 : 4,
                    minHeight: 40,
                    borderRadius: borderRadius.m,
                    shadowColor: color.shadow,
                    boxShadow: [
                        {
                            offsetX: 1,
                            offsetY: 1,
                            spreadDistance: 2,
                            color: color.shadow,
                            blurRadius: 4,
                        },
                    ],
                }}
                onLongPress={handleEnableEdit}>
                {isLastMessage ? (
                    <ChatTextLast isGenerating={isGenerating} swipe={swipe} />
                ) : (
                    <ChatText swipeText={swipe.swipe} reasoning={swipe.reasoning?.content} />
                )}
                {(entry.attachments.length > 0 || (showTPS && appMode === 'local' && timings)) && (
                    <View style={{ paddingHorizontal: spacing.m, paddingBottom: spacing.sm }}>
                        <ChatAttachments entry={entry} />
                        <View
                            style={{
                                flexDirection: 'row',
                            }}>
                            {showTPS && appMode === 'local' && timings && (
                                <Text
                                    style={{
                                        color: color.text._500,
                                        fontWeight: '300',
                                        textAlign: 'right',
                                        fontSize: fontSize.s,
                                    }}>
                                    {t('chat.bubble.promptSpeed', {
                                        tokens: getFiniteValue(timings.prompt_per_second),
                                        seconds: getFiniteValue(timings.prompt_ms / 1000),
                                    })}
                                    {t('chat.bubble.textGenerationSpeed', {
                                        tokens: getFiniteValue(timings.predicted_per_second),
                                        seconds: getFiniteValue(timings.predicted_ms / 1000),
                                    })}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </AnimatedPressable>
            {showSwipe && (
                <ChatSwipes swipe={swipe} isGenerating={isGenerating} isGreeting={isGreeting} />
            )}
        </View>
    )
}

const getFiniteValue = (value: number | null) => {
    if (!value || !isFinite(value)) return (0).toFixed(2)
    return value.toFixed(2)
}

export default ChatBubble
