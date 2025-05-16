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

import { useChatEditorState } from './EditorModal'
import TTS from './TTS'

interface OptionsStateProps {
    activeIndex?: number
    setActiveIndex: (n: number | undefined) => void
}

useInference.subscribe(({ nowGenerating }) => {
    if (nowGenerating) {
        optionState.getState().setActiveIndex(undefined)
    }
})
export const optionState = create<OptionsStateProps>()((set) => ({
    setActiveIndex: (n) => set({ activeIndex: n }),
}))

interface ChatActionProps {
    index: number
    nowGenerating: boolean
    isLastMessage: boolean
}

const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/

const ChatActions: React.FC<ChatActionProps> = ({ index, nowGenerating, isLastMessage }) => {
    const { activeIndex, setShowOptions } = optionState(
        useShallow((state) => ({
            setShowOptions: state.setActiveIndex,
            activeIndex: state.activeIndex,
        }))
    )

    const showEditor = useChatEditorState((state) => state.show)
    const handleEnableEdit = () => {
        if (!nowGenerating) showEditor(index)
    }

    const { color } = Theme.useTheme()
    const [quickDelete, __] = useMMKVBoolean(AppSettings.QuickDelete)
    const { deleteEntry } = Chats.useEntry()
    const { swipe } = Chats.useSwipeData(index)

    const { activeChatIndex } = useTTS()

    const showOptions = activeIndex === index
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

    const code = swipe.swipe.match(codeBlockRegex)
    const isSpeaking = index === activeChatIndex
    if (!isSpeaking && (!showOptions || nowGenerating)) return

    return (
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Animated.View
                entering={StretchInY.duration(100)}
                exiting={StretchOutY.duration(100)}
                style={{
                    flexDirection: 'row',
                    columnGap: 16,
                    alignItems: 'center',
                    position: 'absolute',
                    paddingVertical: 4,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: color.primary._500,
                    backgroundColor: color.neutral._300,
                    bottom: -4,
                    zIndex: 21,
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
                        {code && (
                            <Animated.View
                                entering={ZoomIn.duration(200)}
                                exiting={ZoomOut.duration(200)}>
                                <ThemedButton
                                    variant="tertiary"
                                    iconName="codesquareo"
                                    iconSize={24}
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
                                                    Logger.errorToast('Failed to copy to clipboard')
                                                })
                                    }}
                                />
                            </Animated.View>
                        )}
                    </>
                )}
                <TTS index={index} />
            </Animated.View>
        </View>
    )
}

export default ChatActions
