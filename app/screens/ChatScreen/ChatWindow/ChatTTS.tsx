import Octicons from '@react-native-vector-icons/octicons/static'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'
import Animated, {
    ZoomIn,
    ZoomOut,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated'

import { ChatSwipe } from '@db/schema'
import { isAudioActive, useAudioState } from '@lib/audio/state'
import { useChatGenerating } from '@lib/engine/generation/hooks'
import { Chats } from '@lib/state/chat'
import { Theme } from '@lib/theme/ThemeManager'
import { speakMessage } from '@lib/tts/actions'
import { useTTSSettingsStore } from '@lib/tts/settingsStore'
import { isTTSActive, useTTSState } from '@lib/tts/state'

const ChatTTS = ({ swipe }: { swipe: ChatSwipe }) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const enabled = useTTSSettingsStore((state) => state.enabled)
    const hasVoice = useTTSSettingsStore((state) => !!state.voice)
    const active = useTTSState(
        (state) => state.session?.swipeId === swipe.id && isTTSActive(state.session)
    )
    const { chatId } = Chats.useChat()
    const generating = useChatGenerating(chatId)
    const opacity = useSharedValue(1)
    useEffect(() => {
        opacity.set(active ? withRepeat(withTiming(0.45, { duration: 650 }), -1, true) : 1)
        return () => cancelAnimation(opacity)
    }, [active, opacity])
    const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }))
    const audioActive = useAudioState((state) => state.recording || isAudioActive(state.session))
    if (!enabled) return null
    const disabled = active || generating || !hasVoice || audioActive
    return (
        <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(active ? 'tts.status.speaking' : 'tts.speak')}
                accessibilityState={{ disabled: disabled, busy: active }}
                disabled={disabled}
                onPress={() => speakMessage(swipe.id)}>
                <Animated.View style={pulse}>
                    <Octicons
                        name="unmute"
                        size={24}
                        color={disabled ? color.text._600 : color.primary._400}
                    />
                </Animated.View>
            </Pressable>
        </Animated.View>
    )
}
export default ChatTTS
