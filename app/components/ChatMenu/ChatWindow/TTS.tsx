import { useTTS } from '@constants/TTS'
import { FontAwesome } from '@expo/vector-icons'
import { Chats } from 'constants/Chat'
import { Logger, Style } from 'constants/Global'
import { TouchableOpacity, View } from 'react-native'

type TTSProps = {
    index: number
}

const TTS: React.FC<TTSProps> = ({ index }) => {
    const { startTTS, activeChatIndex, stopTTS } = useTTS()
    const { swipeText } = Chats.useSwipeData(index)
    const isSpeaking = index === activeChatIndex

    const handleSpeak = async () => {
        Logger.log('Starting TTS')
        await startTTS(swipeText, index)
    }

    const handleStopSpeaking = async () => {
        Logger.log('TTS stopped')
        await stopTTS()
    }

    return (
        <View style={{ marginTop: 2 }}>
            {isSpeaking ? (
                <TouchableOpacity onPress={handleStopSpeaking}>
                    <FontAwesome
                        name="stop"
                        size={20}
                        color={Style.getColor('destructive-brand')}
                    />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={handleSpeak}>
                    <FontAwesome
                        name="volume-down"
                        size={28}
                        color={Style.getColor('primary-text2')}
                    />
                </TouchableOpacity>
            )}
        </View>
    )
}

export default TTS
