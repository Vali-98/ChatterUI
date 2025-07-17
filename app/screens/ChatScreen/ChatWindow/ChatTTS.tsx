import { Octicons } from '@expo/vector-icons'
import { Chats, useInference } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { useTTS } from '@lib/state/TTS'
import { Theme } from '@lib/theme/ThemeManager'
import { TouchableOpacity, View } from 'react-native'
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated'

type TTSProps = {
    index: number
}

const ChatTTS: React.FC<TTSProps> = ({ index }) => {
    const { color } = Theme.useTheme()
    const { startTTS, activeChatIndex, stopTTS, enabled } = useTTS()
    const { swipeText } = Chats.useSwipeData(index)
    const nowGenerating = useInference((state) => state.nowGenerating)
    const isSpeaking = index === activeChatIndex
    const handleSpeak = async () => {
        Logger.info('Starting TTS')
        swipeText && (await startTTS(swipeText, index))
    }

    const handleStopSpeaking = async () => {
        Logger.info('TTS stopped')
        await stopTTS()
    }

    if (enabled)
        return (
            <View>
                {isSpeaking && (
                    <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                        <TouchableOpacity onPress={handleStopSpeaking}>
                            <Octicons name="mute" size={24} color={color.error._500} />
                        </TouchableOpacity>
                    </Animated.View>
                )}
                {!isSpeaking && (
                    <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                        <TouchableOpacity onPress={handleSpeak} disabled={nowGenerating}>
                            <Octicons
                                name="unmute"
                                size={24}
                                color={nowGenerating ? color.text._600 : color.primary._400}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        )
}

export default ChatTTS
