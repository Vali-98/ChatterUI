import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { Pressable, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedButton from '@components/buttons/ThemedButton'
import { Logger } from '@lib/state/Logger'
import { useTTS } from '@lib/state/TTS'
import { setStringAsync } from 'expo-clipboard'
import { useState } from 'react'
import Animated, { StretchInY, StretchOutY } from 'react-native-reanimated'
import ChatText from './ChatText'
import ChatTextLast from './ChatTextLast'
import { useChatEditorState } from './EditorModal'
import Swipes from './Swipes'
import TTS from './TTS'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

type ChatTextProps = {
    index: number
    nowGenerating: boolean
    isLastMessage: boolean
    isGreeting: boolean
}
const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/

interface OptionsStateProps {
    activeIndex?: number
    setActiveIndex: (n: number | undefined) => void
}

const optionState = create<OptionsStateProps>()((set) => ({
    setActiveIndex: (n) => set({ activeIndex: n }),
}))

const ChatBody: React.FC<ChatTextProps> = ({ index, nowGenerating, isLastMessage, isGreeting }) => {
    const message = Chats.useEntryData(index)
    const { appMode } = useAppMode()
    const [showTPS, __] = useMMKVBoolean(AppSettings.ShowTokenPerSecond)
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    const { activeChatIndex } = useTTS()
    const { activeIndex, setShowOptions } = optionState(
        useShallow((state) => ({
            setShowOptions: state.setActiveIndex,
            activeIndex: state.activeIndex,
        }))
    )

    const showOptions = activeIndex === index

    const showEditor = useChatEditorState((state) => state.show)
    const handleEnableEdit = () => {
        if (!nowGenerating) showEditor(index)
    }
    const swipe = message.swipes[message.swipe_id].swipe
    const code = swipe.match(codeBlockRegex)
    const hasSwipes = message?.swipes?.length > 1
    const showSwipe = !message.is_user && isLastMessage && (hasSwipes || !isGreeting)
    const timings = message.swipes[message.swipe_id].timings

    const isSpeaking = index === activeChatIndex

    return (
        <View>
            <Pressable
                onPress={() => {
                    setShowOptions(showOptions ? undefined : index)
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
                    elevation: 2,
                }}
                onLongPress={handleEnableEdit}>
                {isLastMessage ? (
                    <ChatTextLast nowGenerating={nowGenerating} index={index} />
                ) : (
                    <ChatText nowGenerating={nowGenerating} index={index} />
                )}
                <View
                    style={{
                        flexDirection: 'row-reverse',
                        justifyContent: 'space-between',
                    }}>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        {(showOptions || isSpeaking) && (
                            <Animated.View
                                entering={StretchInY.duration(100)}
                                exiting={StretchOutY.duration(100)}
                                style={{
                                    flexDirection: 'row',
                                    columnGap: 12,
                                    alignItems: 'center',
                                    position: 'absolute',
                                    paddingVertical: 4,
                                    paddingHorizontal: 16,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: color.primary._500,
                                    backgroundColor: color.neutral._300,
                                    bottom: 0,
                                    zIndex: 21,
                                }}>
                                {!(isLastMessage && nowGenerating) && (
                                    <>
                                        <ThemedButton
                                            variant="tertiary"
                                            iconName="copy1"
                                            iconSize={16}
                                            iconStyle={{
                                                color: color.text._500,
                                            }}
                                            onPress={() => {
                                                setStringAsync(swipe)
                                                    .then(() => {
                                                        Logger.infoToast('Copied')
                                                    })
                                                    .catch(() => {
                                                        Logger.errorToast(
                                                            'Failed to copy to clipboard'
                                                        )
                                                    })
                                            }}
                                        />
                                        <ThemedButton
                                            variant="tertiary"
                                            iconName="edit"
                                            iconSize={16}
                                            iconStyle={{
                                                color: color.text._500,
                                            }}
                                            onPress={handleEnableEdit}
                                        />
                                        {code && (
                                            <ThemedButton
                                                variant="tertiary"
                                                iconName="codesquareo"
                                                iconSize={16}
                                                iconStyle={{
                                                    color: color.text._500,
                                                }}
                                                onPress={() => {
                                                    if (code[1])
                                                        setStringAsync(code[1])
                                                            .then(() => {
                                                                Logger.infoToast('Copied Code')
                                                            })
                                                            .catch(() => {
                                                                Logger.errorToast(
                                                                    'Failed to copy to clipboard'
                                                                )
                                                            })
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                                <TTS index={index} />
                            </Animated.View>
                        )}
                    </View>
                    {showTPS && appMode === 'local' && timings && (
                        <Text
                            style={{
                                color: color.text._500,
                                fontWeight: '300',
                                textAlign: 'right',
                                fontSize: fontSize.s,
                                zIndex: 20,
                            }}>
                            {`Prompt: ${getFiniteValue(timings.prompt_per_second)} t/s`}
                            {`   Text Gen: ${getFiniteValue(timings.predicted_per_second)} t/s`}
                        </Text>
                    )}
                </View>
            </Pressable>
            {showSwipe && (
                <Swipes index={index} nowGenerating={nowGenerating} isGreeting={isGreeting} />
            )}
        </View>
    )
}

const getFiniteValue = (value: number | null) => {
    if (!value || !isFinite(value)) return (0).toFixed(2)
    return value.toFixed(2)
}

export default ChatBody
