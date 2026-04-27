import { setStringAsync } from 'expo-clipboard'
import React, { useCallback } from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { StretchInY, StretchOutY, ZoomIn, ZoomOut } from 'react-native-reanimated'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import Alert from '@components/views/Alert'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useBackAction } from '@lib/hooks/BackAction'
import { Chats, useInference } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { useTTS } from '@lib/state/TTS'
import { Theme } from '@lib/theme/ThemeManager'
import { ChatSwipe } from 'db/schema'

import { useChatEditorStore } from './ChatEditor'
import ChatTTS from './ChatTTS'

interface OptionsStateProps {
    activeEntryId?: number
    setActiveIndex: (n: number | undefined) => void
}

useInference.subscribe(({ nowGenerating }) => {
    if (nowGenerating) {
        useChatActionsState.getState().setActiveIndex(undefined)
    }
})
export const useChatActionsState = create<OptionsStateProps>()((set, get) => ({
    setActiveIndex: (n) => set({ activeEntryId: get().activeEntryId === n ? undefined : n }),
}))

interface ChatActionProps {
    entryId: number
    nowGenerating: boolean
    isLastMessage: boolean
    swipe: ChatSwipe
    index: number
}

const ChatQuickActions: React.FC<ChatActionProps> = ({
    entryId,
    nowGenerating,
    isLastMessage,
    swipe,
    index,
}) => {
    const { activeEntryId, setShowOptions } = useChatActionsState(
        useShallow((state) => ({
            setShowOptions: state.setActiveIndex,
            activeEntryId: state.activeEntryId,
        }))
    )

    const showEditor = useChatEditorStore((state) => state.show)
    const { color } = Theme.useTheme()
    const [quickDelete] = useMMKVBoolean(AppSettings.QuickDelete)
    const { chatId, setId } = Chats.useChat()

    const { activeChatId } = useTTS()
    const showOptions = activeEntryId === entryId

    const handleEnableEdit = () => {
        if (showOptions) setShowOptions(undefined)
        if (!nowGenerating) showEditor(entryId)
    }

    const handleFork = () => {
        if (!chatId) return
        Alert.alert({
            title: 'Fork Chat',
            description: 'This will create a clone of this chat from this message',
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Fork Chat',
                    onPress: async () => {
                        const newChatId = await Chats.db.mutate.cloneChatFromId(chatId, index + 1)
                        if (!newChatId) {
                            Logger.errorToast('Failed to clone chat')
                            return
                        }
                        setShowOptions(undefined)
                        setId(newChatId)
                    },
                },
            ],
        })
    }

    const backAction = useCallback(() => {
        if (!showOptions || !swipe) return false
        setShowOptions(undefined)
        return true
    }, [showOptions, setShowOptions, swipe])

    useBackAction(backAction)

    if (!swipe) return

    const isSpeaking = entryId === activeChatId
    if (!isSpeaking && (!showOptions || nowGenerating)) return

    return (
        <View
            style={{
                flex: 1,
                alignItems: 'flex-end',
                position: 'absolute',
                bottom: -2,
                right: -4,
                width: '100%',
            }}>
            <Animated.View
                entering={StretchInY.duration(100)}
                exiting={StretchOutY.duration(100)}
                style={{
                    flexDirection: 'row',
                    columnGap: 16,
                    alignItems: 'center',
                    paddingVertical: 4,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: color.primary._500,
                    backgroundColor: color.neutral._100 + 'cc',
                    boxShadow: [
                        {
                            offsetX: 1,
                            offsetY: 1,
                            color: color.shadow,
                            spreadDistance: 1,
                            blurRadius: 4,
                        },
                    ],
                }}>
                {!(isLastMessage && nowGenerating) && (
                    <>
                        {quickDelete && (
                            <Animated.View
                                style={{ flexDirection: 'row' }}
                                entering={ZoomIn.duration(200)}
                                exiting={ZoomOut.duration(200)}>
                                <ThemedButton
                                    variant="tertiary"
                                    iconName="delete"
                                    iconSize={24}
                                    iconStyle={{
                                        color: color.error._400,
                                    }}
                                    onPress={() => {
                                        if (showOptions) setShowOptions(undefined)
                                        Chats.db.mutate.deleteChatEntry(entryId)
                                    }}
                                />
                                <View
                                    style={{
                                        borderColor: color.primary._500,
                                        borderLeftWidth: 1,
                                        marginLeft: 12,
                                        marginRight: 4,
                                    }}
                                />
                            </Animated.View>
                        )}

                        <Animated.View
                            entering={ZoomIn.duration(200)}
                            exiting={ZoomOut.duration(200)}>
                            <ThemedButton
                                variant="tertiary"
                                iconName="fork"
                                iconSize={22}
                                iconStyle={{
                                    color: color.text._500,
                                }}
                                onPress={handleFork}
                            />
                        </Animated.View>

                        <Animated.View
                            entering={ZoomIn.duration(200)}
                            exiting={ZoomOut.duration(200)}>
                            <ThemedButton
                                variant="tertiary"
                                iconName="copy"
                                iconSize={22}
                                iconStyle={{
                                    color: color.text._500,
                                }}
                                onPress={() => {
                                    if (showOptions) setShowOptions(undefined)
                                    setStringAsync(swipe.swipe)
                                        .then(() => {
                                            Logger.infoToast('Copied')
                                        })
                                        .catch(() => {
                                            Logger.errorToast('Failed to copy to clipboard')
                                        })
                                }}
                            />
                        </Animated.View>

                        <Animated.View
                            entering={ZoomIn.duration(200)}
                            exiting={ZoomOut.duration(200)}>
                            <ThemedButton
                                variant="tertiary"
                                iconName="edit"
                                iconSize={24}
                                iconStyle={{
                                    color: color.text._500,
                                }}
                                onPress={handleEnableEdit}
                            />
                        </Animated.View>
                    </>
                )}
                <ChatTTS swipe={swipe} />
            </Animated.View>
        </View>
    )
}

export default ChatQuickActions
