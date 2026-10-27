import { usePathname } from 'expo-router'
import type { ReactNode } from 'react'
import { useWindowDimensions } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, {
    FadeIn,
    FadeOut,
    runOnJS,
    useAnimatedStyle,
    useAnimatedReaction,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CHAT_CONTROL_EDGE, CHAT_CONTROL_GAP } from '@lib/constants/ChatControls'
import { chatSwipeControlBounds, chatControlLift } from '@lib/state/components/chatControlBounds'
import { useChatControlLayoutState } from '@lib/state/components/ChatControls'
import { getChatControlLift } from '@lib/utils/controlPlacement'

import { ChatControlColumn, ChatControlPanel } from './ChatControlColumn'

const PlaybackOverlay = ({ id, children }: { id?: number | string; children: ReactNode }) => {
    const { height: windowHeight } = useWindowDimensions()
    const playerHeight = useChatControlLayoutState((state) => state.playerHeight)
    const inputHeight = useChatControlLayoutState((state) => state.inputHeight)
    const setPlayerHeight = useChatControlLayoutState((state) => state.setPlayerHeight)
    const releasePlayerHeight = useChatControlLayoutState((state) => state.releasePlayerHeight)
    const isChat = usePathname().endsWith('/screens/ChatScreen')
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
    if (id === undefined) return null
    return (
        <Animated.View
            key={id}
            pointerEvents="box-none"
            exiting={FadeOut.duration(200).withCallback(() => {
                runOnJS(releasePlayerHeight)(id)
            })}
            entering={FadeIn.duration(120)}
            style={[{ position: 'absolute', right: CHAT_CONTROL_EDGE, maxWidth: '92%' }, position]}>
            <ChatControlColumn>
                <ChatControlPanel
                    onLayout={(event) => setPlayerHeight(event.nativeEvent.layout.height, id)}>
                    {children}
                </ChatControlPanel>
            </ChatControlColumn>
        </Animated.View>
    )
}
export default PlaybackOverlay
