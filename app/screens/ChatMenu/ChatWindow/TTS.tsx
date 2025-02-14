import { FontAwesome } from '@expo/vector-icons'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { useTTS } from '@lib/state/TTS'
import { Theme } from '@lib/theme/ThemeManager'
import { TouchableOpacity, View } from 'react-native'

type TTSProps = {
    index: number
}

const TTS: React.FC<TTSProps> = ({ index }) => {
    const { color } = Theme.useTheme()
    const { startTTS, activeChatIndex, stopTTS } = useTTS()
    const { swipeText } = Chats.useSwipeData(index)
    const isSpeaking = index === activeChatIndex

    const handleSpeak = async () => {
        Logger.info('Starting TTS')
        swipeText && (await startTTS(swipeText, index))
    }

    const handleStopSpeaking = async () => {
        Logger.info('TTS stopped')
        await stopTTS()
    }

    return (
        <View style={{ paddingTop: 4 }}>
            {isSpeaking ? (
                <TouchableOpacity onPress={handleStopSpeaking}>
                    <FontAwesome name="stop" size={20} color={color.error._500} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={handleSpeak}>
                    <FontAwesome name="volume-down" size={28} color={color.primary._400} />
                </TouchableOpacity>
            )}
        </View>
    )
}

export default TTS
