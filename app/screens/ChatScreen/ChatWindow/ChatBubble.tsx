import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { Pressable, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import ChatQuickActions, { useChatActionsState } from './ChatQuickActions'
import ChatAttachments from './ChatAttachments'
import ChatText from './ChatText'
import ChatTextLast from './ChatTextLast'
import { useChatEditorStore } from './ChatEditor'
import ChatSwipes from './ChatSwipes'

type ChatTextProps = {
    index: number
    nowGenerating: boolean
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatBubble: React.FC<ChatTextProps> = ({
    index,
    nowGenerating,
    isLastMessage,
    isGreeting,
}) => {
    const message = Chats.useEntryData(index)
    const { appMode } = useAppMode()
    const [showTPS, _] = useMMKVBoolean(AppSettings.ShowTokenPerSecond)
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    const { activeIndex, setShowOptions } = useChatActionsState(
        useShallow((state) => ({
            setShowOptions: state.setActiveIndex,
            activeIndex: state.activeIndex,
        }))
    )

    const showEditor = useChatEditorStore((state) => state.show)
    const handleEnableEdit = () => {
        if (!nowGenerating) showEditor(index)
    }

    const hasSwipes = message?.swipes?.length > 1
    const showSwipe = !message.is_user && isLastMessage && (hasSwipes || !isGreeting)
    const timings = message.swipes[message.swipe_id].timings

    return (
        <View>
            <Pressable
                onPress={() => {
                    setShowOptions(activeIndex === index || nowGenerating ? undefined : index)
                }}
                style={{
                    backgroundColor: color.neutral._200,
                    borderColor: color.neutral._200,
                    borderWidth: 1,
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
