import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Animated, {
    ZoomIn,
    ZoomOut,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated'

import IconButton from '@components/buttons/IconButton'
import { ChatSwipe } from '@db/schema'
import { isAudioActive, useAudioState } from '@lib/audio/state'
import { useChatGenerating } from '@lib/engine/generation/hooks'
import { Chats } from '@lib/state/chat'
import { speakMessage } from '@lib/tts/actions'
import { useTTSSettingsStore } from '@lib/tts/settingsStore'
import { isTTSActive, useTTSState } from '@lib/tts/state'

const ChatTTS = ({ swipe }: { swipe: ChatSwipe }) => {
    const { t } = useTranslation()
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
            <Animated.View style={pulse}>
                <IconButton
                    iconName={{ family: 'octicons', name: 'unmute' }}
                    level="primary"
                    accessibilityLabel={t(active ? 'tts.status.speaking' : 'tts.speak')}
                    accessibilityState={{ disabled, busy: active }}
                    disabled={disabled}
                    onPress={() => speakMessage(swipe.id)}
                />
            </Animated.View>
        </Animated.View>
    )
}
export default ChatTTS
