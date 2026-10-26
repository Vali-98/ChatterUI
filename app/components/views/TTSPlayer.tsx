import AntDesign from '@react-native-vector-icons/ant-design/static'
import Octicons from '@react-native-vector-icons/octicons/static'
import { usePathname } from 'expo-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { View, useWindowDimensions } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, {
    FadeIn,
    FadeOut,
    ZoomIn,
    ZoomOut,
    runOnJS,
    useAnimatedStyle,
    useAnimatedReaction,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import { CHAT_CONTROL_EDGE, CHAT_CONTROL_GAP } from '@lib/constants/ChatControls'
import { chatSwipeControlBounds, chatControlLift } from '@lib/state/components/chatControlBounds'
import { useChatControlLayoutState } from '@lib/state/components/ChatControls'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { jumpToTTSSource } from '@lib/tts/actions'
import { observeGenerationTTS } from '@lib/tts/generationBridge'
import { replayTTS, setTTSChatVisible, stopTTS } from '@lib/tts/player'
import { useTTSState } from '@lib/tts/state'
import { getChatControlLift } from '@lib/utils/controlPlacement'

import { ChatControlColumn, ChatControlPanel } from './ChatControlColumn'

const TTSPlayer = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const session = useTTSState(
        useShallow((state) =>
            state.session
                ? {
                      id: state.session.id,
                      name: state.session.name,
                      kind: state.session.kind,
                      messageId: state.session.messageId,
                      status: state.session.status,
                  }
                : undefined
        )
    )
    const { height: windowHeight } = useWindowDimensions()
    const playerHeight = useChatControlLayoutState((state) => state.playerHeight)
    const inputHeight = useChatControlLayoutState((state) => state.inputHeight)
    const setPlayerHeight = useChatControlLayoutState((state) => state.setPlayerHeight)
    const releasePlayerHeight = useChatControlLayoutState((state) => state.releasePlayerHeight)
    const isChat = usePathname().endsWith('/screens/ChatScreen')
    useEffect(() => {
        setTTSChatVisible(isChat)
    }, [isChat])
    const insets = useSafeAreaInsets()
    const { height } = useReanimatedKeyboardAnimation()
    useAnimatedReaction(
        () => {
            if (!isChat || playerHeight <= 0) return 0
            const bottomInset =
                Math.max(insets.bottom, -height.value) + inputHeight + CHAT_CONTROL_EDGE
            const bottom = windowHeight - bottomInset
            return getChatControlLift(
                { top: bottom - playerHeight, bottom: bottom },
                chatSwipeControlBounds.value,
                CHAT_CONTROL_GAP
            )
        },
        (lift) => {
            if (chatControlLift.value !== lift) chatControlLift.set(lift)
        }
    )
    const position = useAnimatedStyle(() => ({
        bottom:
            Math.max(insets.bottom, -height.value) +
            (isChat ? inputHeight + CHAT_CONTROL_EDGE + chatControlLift.value : CHAT_CONTROL_EDGE),
    }))
    useEffect(() => {
        const unsubscribe = observeGenerationTTS()
        return () => {
            unsubscribe()
            void stopTTS()
        }
    }, [])
    if (!session) return null
    return (
        <Animated.View
            key={session.id}
            pointerEvents="box-none"
            exiting={FadeOut.duration(200).withCallback(() => {
                runOnJS(releasePlayerHeight)(session.id)
            })}
            entering={FadeIn.duration(120)}
            style={[{ position: 'absolute', right: CHAT_CONTROL_EDGE, maxWidth: '92%' }, position]}>
            <ChatControlColumn>
                <ChatControlPanel
                    onLayout={(event) =>
                        setPlayerHeight(event.nativeEvent.layout.height, session.id)
                    }>
                    <Animated.Text
                        entering={ZoomIn.duration(200)}
                        exiting={ZoomOut.duration(200)}
                        numberOfLines={1}
                        style={{
                            color: color.text._400,
                            fontSize: 13,
                            lineHeight: 18,
                            flexShrink: 1,
                            maxWidth: 160,
                        }}>
                        {session.name ??
                            t(session.kind === 'preview' ? 'tts.preview' : 'tts.player')}
                    </Animated.Text>
                    {session.messageId !== undefined && (
                        <Animated.View
                            entering={ZoomIn.duration(200)}
                            exiting={ZoomOut.duration(200)}>
                            <ThemedButton
                                variant="tertiary"
                                icon={
                                    <View style={{ width: 26, height: 24 }}>
                                        <AntDesign
                                            name="message"
                                            size={22}
                                            color={color.text._400}
                                        />
                                        <AntDesign
                                            name="arrow-right"
                                            size={12}
                                            color={color.text._400}
                                            style={{
                                                position: 'absolute',
                                                bottom: -2,
                                                right: -2,
                                                backgroundColor: color.neutral._100,
                                                borderRadius: 3,
                                            }}
                                        />
                                    </View>
                                }
                                accessibilityLabel={t('tts.jumpToMessage')}
                                onPress={() => {
                                    void jumpToTTSSource().catch(Logger.stackTrace)
                                }}
                            />
                        </Animated.View>
                    )}
                    {session.status === 'finished' && (
                        <Animated.View
                            entering={ZoomIn.duration(200)}
                            exiting={ZoomOut.duration(200)}>
                            <ThemedButton
                                variant="tertiary"
                                iconName="reload"
                                iconSize={24}
                                accessibilityLabel={t('tts.replay')}
                                onPress={replayTTS}
                            />
                        </Animated.View>
                    )}
                    <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                        <ThemedButton
                            variant="tertiary"
                            icon={
                                session.status === 'finished' || session.status === 'failed' ? (
                                    <AntDesign name="close" size={24} color={color.text._400} />
                                ) : (
                                    <Octicons name="mute" size={24} color={color.error._500} />
                                )
                            }
                            accessibilityLabel={t(
                                session.status === 'finished' || session.status === 'failed'
                                    ? 'common.actions.close'
                                    : 'tts.stop'
                            )}
                            onPress={() => {
                                void stopTTS()
                            }}
                        />
                    </Animated.View>
                </ChatControlPanel>
            </ChatControlColumn>
        </Animated.View>
    )
}
export default TTSPlayer
