import { Pressable, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'

import ChatAttachments from './ChatAttachments'
import { useChatEditorStore } from './ChatEditor'
import ChatQuickActions, { useChatActionsState } from './ChatQuickActions'
import ChatSwipes from './ChatSwipes'
import ChatText from './ChatText'
import ChatTextLast from './ChatTextLast'

type ChatTextProps = {
    index: number
    nowGenerating: boolean
    isLastMessage: boolean
    isGreeting: boolean
    /** When true the bubble uses the semi-transparent VN aesthetic */
    vnMode?: boolean
}

const ChatBubble: React.FC<ChatTextProps> = ({
    index,
    nowGenerating,
    isLastMessage,
    isGreeting,
    vnMode = false,
}) => {
    const message = Chats.useEntryData(index)
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
        if (!nowGenerating) showEditor(index)
    }

    const hasSwipes = message?.swipes?.length > 1
    const showSwipe = !message.is_user && isLastMessage && (hasSwipes || !isGreeting)
    const timings = message.swipes[message.swipe_id].timings

    // ── VN mode ──────────────────────────────────────────────────────────────
    if (vnMode) {
        const isUser = message.is_user
        return (
            <View
                style={{
                    // In VN mode messages are left-aligned for the AI and right for the user
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    marginHorizontal: spacing.m,
                }}>
                {/* Character / user name label */}
                <Text
                    style={{
                        color: isUser ? color.primary._400 : color.text._100,
                        fontWeight: '700',
                        fontSize: fontSize.s,
                        marginBottom: 2,
                        marginLeft: 4,
                        textShadowColor: 'rgba(0,0,0,0.8)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                    }}>
                    {message.name}
                </Text>

                <Pressable
                    onPress={() => setShowOptions(nowGenerating ? undefined : index)}
                    onLongPress={handleEnableEdit}
                    style={{
                        // Semi-transparent dark panel — classic VN style
                        backgroundColor: isUser
                            ? color.primary._900 + 'cc'
                            : 'rgba(10, 10, 20, 0.75)',
                        borderColor: isUser
                            ? color.primary._500 + '55'
                            : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        marginBottom: showSwipe ? 0 : 4,
                        paddingVertical: spacing.m,
                        paddingHorizontal: spacing.l,
                        borderRadius: borderRadius.l,
                        // Subtle backdrop blur feel via shadow
                        shadowColor: '#000',
                        shadowOpacity: 0.5,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                    }}>
                    {isLastMessage ? (
                        <ChatTextLast nowGenerating={nowGenerating} index={index} />
                    ) : (
                        <ChatText nowGenerating={nowGenerating} index={index} />
                    )}
                    <ChatAttachments index={index} />
                    <View style={{ flexDirection: 'row' }}>
                        {showTPS && appMode === 'local' && timings && (
                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.45)',
                                    fontWeight: '300',
                                    textAlign: 'right',
                                    fontSize: fontSize.s,
                                }}>
                                {`Prompt: ${getFiniteValue(timings.prompt_per_second)} t/s`}
                                {`   Text Gen: ${getFiniteValue(timings.predicted_per_second)} t/s`}
                            </Text>
                        )}
                        <ChatQuickActions
                            nowGenerating={nowGenerating}
                            isLastMessage={isLastMessage}
                            index={index}
                        />
                    </View>
                </Pressable>

                {showSwipe && (
                    <ChatSwipes
                        index={index}
                        nowGenerating={nowGenerating}
                        isGreeting={isGreeting}
                    />
                )}
            </View>
        )
    }

    // ── Standard mode (original code, unchanged) ──────────────────────────────
    return (
        <View>
            <Pressable
                onPress={() => {
                    setShowOptions(nowGenerating ? undefined : index)
                }}
                style={{
                    backgroundColor: color.neutral._200,
                    borderColor: color.neutral._200,
                    borderWidth: 1,
                    marginBottom: showSwipe ? 0 : 4,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.m,
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
                    <ChatTextLast nowGenerating={nowGenerating} index={index} />
                ) : (
                    <ChatText nowGenerating={nowGenerating} index={index} />
                )}
                <ChatAttachments index={index} />
                <View style={{ flexDirection: 'row' }}>
                    {showTPS && appMode === 'local' && timings && (
                        <Text
                            style={{
                                color: color.text._500,
                                fontWeight: '300',
                                textAlign: 'right',
                                fontSize: fontSize.s,
                            }}>
                            {`Prompt: ${getFiniteValue(timings.prompt_per_second)} t/s`}
                            {`   Text Gen: ${getFiniteValue(timings.predicted_per_second)} t/s`}
                        </Text>
                    )}
                    <ChatQuickActions
                        nowGenerating={nowGenerating}
                        isLastMessage={isLastMessage}
                        index={index}
                    />
                </View>
            </Pressable>
            {showSwipe && (
                <ChatSwipes index={index} nowGenerating={nowGenerating} isGreeting={isGreeting} />
            )}
        </View>
    )
}

const getFiniteValue = (value: number | null) => {
    if (!value || !isFinite(value)) return (0).toFixed(2)
    return value.toFixed(2)
}

export default ChatBubble
