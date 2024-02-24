import { FontAwesome } from '@expo/vector-icons'
import { Global, Color, Logger, Chats } from '@globals'
import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'

type TTSProps = {
    message: string
    isLast?: boolean
}

const TTS: React.FC<TTSProps> = ({ message, isLast }) => {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
    const [currentSpeaker, setCurrentSpeaker] = useMMKVObject<Speech.Voice>(Global.TTSSpeaker)
    const [autoTTS, setAutoTTS] = useMMKVBoolean(Global.TTSAuto)

    const [start, setStart] = useMMKVBoolean(Global.TTSAutoStart)
    const nowGenerating = Chats.useChat((state) => state.nowGenerating)

    useEffect(() => {
        if (nowGenerating) handleStopSpeaking()
    }, [nowGenerating])

    useEffect(() => {
        if (autoTTS && isLast && start) handleSpeak()
    }, [start])

    const handleSpeak = async () => {
        setStart(false)
        if (currentSpeaker === undefined) {
            Logger.log(`No Speaker Chosen`, true)
            return
        }
        setIsSpeaking(true)
        if (await Speech.isSpeakingAsync()) Speech.stop()
        Speech.speak(message, {
            language: currentSpeaker?.language,
            voice: currentSpeaker?.identifier,
            onDone: () => setIsSpeaking(false),
            onStopped: () => setIsSpeaking(false),
        })
    }

    const handleStopSpeaking = () => {
        setIsSpeaking(false)
        Speech.stop()
    }

    return (
        <View style={{ marginTop: 8 }}>
            {isSpeaking ? (
                <TouchableOpacity onPress={handleStopSpeaking}>
                    <FontAwesome name="stop" size={20} color={Color.Button} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={handleSpeak}>
                    <FontAwesome name="volume-down" size={28} color={Color.Button} />
                </TouchableOpacity>
            )}
        </View>
    )
}

export default TTS
