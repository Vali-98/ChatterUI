import { useState } from 'react'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { ToolCallData } from 'db/schema'
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
    const isToolMessage = message.role === 'tool'
    const showSwipe =
        !message.is_user && !isToolMessage && isLastMessage && (hasSwipes || !isGreeting)
    const currentSwipe = message.swipes[message.swipe_id]
    const hasToolCalls = currentSwipe?.tool_calls && currentSwipe.tool_calls.length > 0
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
                {hasToolCalls && (
                    <ToolCallIndicator
                        toolCalls={currentSwipe.tool_calls!}
                        color={color}
                        fontSize={fontSize}
                        spacing={spacing}
                        borderRadius={borderRadius}
                    />
                )}
                {isToolMessage && (
                    <ToolResultHeader
                        name={message.name}
                        color={color}
                        fontSize={fontSize}
                        spacing={spacing}
                    />
                )}
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

type ToolCallIndicatorProps = {
    toolCalls: ToolCallData[]
    color: any
    fontSize: any
    spacing: any
    borderRadius: any
}

const ToolCallIndicator = ({
    toolCalls,
    color,
    fontSize,
    spacing,
    borderRadius,
}: ToolCallIndicatorProps) => {
    const [expanded, setExpanded] = useState(false)
    return (
        <Pressable onPress={() => setExpanded(!expanded)}>
            <View
                style={{
                    backgroundColor: color.neutral._300,
                    borderRadius: borderRadius.s,
                    padding: spacing.sm,
                    marginBottom: spacing.sm,
                }}>
                <Text style={{ color: color.text._300, fontSize: fontSize.s, fontWeight: '600' }}>
                    {expanded ? '\u25BC' : '\u25B6'} Tool Call
                    {toolCalls.length > 1 ? 's' : ''}:{' '}
                    {toolCalls.map((tc) => tc.function.name).join(', ')}
                </Text>
                {expanded &&
                    toolCalls.map((tc, i) => (
                        <View key={tc.id || i} style={{ marginTop: spacing.sm }}>
                            <Text
                                style={{
                                    color: color.text._400,
                                    fontSize: fontSize.s,
                                    fontFamily: 'monospace',
                                }}>
                                {tc.function.name}({tc.function.arguments})
                            </Text>
                        </View>
                    ))}
            </View>
        </Pressable>
    )
}

type ToolResultHeaderProps = {
    name: string
    color: any
    fontSize: any
    spacing: any
}

const ToolResultHeader = ({ name, color, fontSize, spacing }: ToolResultHeaderProps) => {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.sm,
            }}>
            <Text style={{ color: color.text._400, fontSize: fontSize.s, fontWeight: '600' }}>
                {'\u2699\uFE0F'} Tool Result: {name}
            </Text>
        </View>
    )
}

export default ChatBubble
