import { Chats, useInference } from '@constants/Chat'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Logger, Style } from '@globals'
import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'

type TTSProps = {
    id: number
    isLast?: boolean
}

const TTS: React.FC<TTSProps> = ({ id, isLast }) => {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
    const [currentSpeaker, setCurrentSpeaker] = useMMKVObject<Speech.Voice>(Global.TTSSpeaker)
    const [autoTTS, setAutoTTS] = useMMKVBoolean(Global.TTSAuto)
    const [start, setStart] = useMMKVBoolean(Global.TTSAutoStart)
    const nowGenerating = useInference((state) => state.nowGenerating)

    const { message } = Chats.useChat((state) => ({
        message:
            state.data?.messages?.[id]?.swipes[state.data?.messages?.[id].swipe_id].swipe ?? '',
    }))

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
        if (await Speech.isSpeakingAsync()) await Speech.stop()
        setIsSpeaking(true)
        const filter = /([!?.,*"])/
        const filteredchunks: string[] = []
        const chunks = message.split(filter)
        chunks.forEach((item, index) => {
            if (!filter.test(item) && item) return filteredchunks.push(item)
            if (index > 0)
                filteredchunks[filteredchunks.length - 1] =
                    filteredchunks[filteredchunks.length - 1] + item
        })
        if (filteredchunks.length === 0) filteredchunks.push(message)

        const cleanedchunks = filteredchunks.map((item) => item.replaceAll(/[*"]/g, '').trim())
        Logger.debug('TTS started with ' + cleanedchunks.length + ' chunks')

        cleanedchunks.forEach((chunk, index) =>
            Speech.speak(chunk, {
                language: currentSpeaker?.language,
                voice: currentSpeaker?.identifier,
                onDone: () => {
                    index === cleanedchunks.length - 1 && setIsSpeaking(false)
                },
                onStopped: () => setIsSpeaking(false),
            })
        )
        if (cleanedchunks.length === 0) setIsSpeaking(false)
    }

    const handleStopSpeaking = async () => {
        Logger.log('TTS stopped')
        await Speech.stop()
        setIsSpeaking(false)
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
