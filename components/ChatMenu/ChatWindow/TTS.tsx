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
        if (nowGenerating && isSpeaking) handleStopSpeaking()
    }, [nowGenerating])

    useEffect(() => {
        if (autoTTS && isLast && start) handleSpeak()
    }, [start])

    const handleSpeak = async () => {
        Logger.log('Starting TTS')
        setStart(false)
        if (currentSpeaker === undefined) {
            Logger.log(`No Speaker Chosen`, true)
            return
        }
        setIsSpeaking(true)
        if (await Speech.isSpeakingAsync()) Speech.stop()
        const filter = /([!?.,])/
        const finalchunks: Array<string> = []
        const chunks = message.split(filter)
        chunks.forEach(
            (item, index) =>
                index > 0 && filter.test(item) && finalchunks.push(chunks.at(index - 1) + item)
        )
        Logger.debug('TTS started with ' + finalchunks.length + ' chunks')
        finalchunks.forEach((chunk, index) =>
            Speech.speak(chunk, {
                language: currentSpeaker?.language,
                voice: currentSpeaker?.identifier,
                onDone: () => {
                    index === chunks.length - 1 && setIsSpeaking(false)
                },
                onStopped: () => setIsSpeaking(false),
            })
        )
    }

    const handleStopSpeaking = async () => {
        Logger.log('TTS stopped')
        await Speech.stop()
        setIsSpeaking(false)
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
