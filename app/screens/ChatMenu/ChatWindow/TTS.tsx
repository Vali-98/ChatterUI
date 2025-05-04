import { FontAwesome, Octicons } from '@expo/vector-icons'
import { Chats, useInference } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { useTTS, useTTSState } from '@lib/state/TTS'
import { Theme } from '@lib/theme/ThemeManager'
import { TouchableOpacity, View } from 'react-native'

type TTSProps = {
    index: number
}

const TTS: React.FC<TTSProps> = ({ index }) => {
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
                {isSpeaking ? (
                    <TouchableOpacity onPress={handleStopSpeaking}>
                        <Octicons name="mute" size={20} color={color.error._500} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleSpeak} disabled={nowGenerating}>
                        <Octicons
                            name="unmute"
                            size={20}
                            color={nowGenerating ? color.text._600 : color.primary._400}
                        />
                    </TouchableOpacity>
                )}
            </View>
        )
}

export default TTS
