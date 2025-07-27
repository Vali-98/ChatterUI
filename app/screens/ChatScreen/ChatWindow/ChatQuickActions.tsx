import ThemedButton from '@components/buttons/ThemedButton'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Chats, useInference } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { useTTS } from '@lib/state/TTS'
import { Theme } from '@lib/theme/ThemeManager'
import { setStringAsync } from 'expo-clipboard'
import { useFocusEffect } from 'expo-router'
import React, { useCallback } from 'react'
import { BackHandler, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { StretchInY, StretchOutY, ZoomIn, ZoomOut } from 'react-native-reanimated'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useChatEditorStore } from './ChatEditor'
import ChatTTS from './ChatTTS'

interface OptionsStateProps {
    activeIndex?: number
    setActiveIndex: (n: number | undefined) => void
}

useInference.subscribe(({ nowGenerating }) => {
    if (nowGenerating) {
        useChatActionsState.getState().setActiveIndex(undefined)
    }
})
export const useChatActionsState = create<OptionsStateProps>()((set) => ({
    setActiveIndex: (n) => set({ activeIndex: n }),
}))

interface ChatActionProps {
    index: number
    nowGenerating: boolean
    isLastMessage: boolean
}

const ChatQuickActions: React.FC<ChatActionProps> = ({ index, nowGenerating, isLastMessage }) => {
    const { activeIndex, setShowOptions } = useChatActionsState(
        useShallow((state) => ({
            setShowOptions: state.setActiveIndex,
            activeIndex: state.activeIndex,
        }))
    )
    const showEditor = useChatEditorStore((state) => state.show)
    const { color } = Theme.useTheme()
    const [quickDelete, __] = useMMKVBoolean(AppSettings.QuickDelete)
    const { deleteEntry } = Chats.useEntry()
    const { swipe } = Chats.useSwipeData(index)
    const { activeChatIndex } = useTTS()
    const showOptions = activeIndex === index

    const handleEnableEdit = () => {
        if (showOptions) setShowOptions(undefined)
        if (!nowGenerating) showEditor(index)
    }

    useFocusEffect(
        useCallback(() => {
            const backAction = () => {
                if (showOptions && swipe) {
                    setShowOptions(undefined)
                    return true
                }
                return false
            }
            const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
            return () => handler.remove()
        }, [showOptions])
    )
    if (!swipe) return

    const isSpeaking = index === activeChatIndex
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
                                        deleteEntry(index)
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
                                iconName="copy1"
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
                <ChatTTS index={index} />
            </Animated.View>
        </View>
    )
}

export default ChatQuickActions
