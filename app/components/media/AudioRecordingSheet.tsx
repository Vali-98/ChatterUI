import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from 'expo-audio'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import BottomSheet, { type BottomSheetRef } from '@components/views/BottomSheet'
import ThemedSpinner from '@components/views/ThemedSpinner'
import { convertAudioAttachment } from '@lib/audio/files'
import { stopAudio, stopAudioSource } from '@lib/audio/player'
import { useAudioState } from '@lib/audio/state'
import { Logger } from '@lib/state/Logger'
import { stopTTS } from '@lib/tts/player'
import { deleteFile } from '@lib/utils/File'

import AudioAttachment from './AudioAttachment'

type Recording = { uri: string; name: string; type: 'audio' }
type RecordingSheetProps = {
    ref: BottomSheetRef
    chatId: number
    onAttach: (recording: Recording) => void
}

const RecordingControls = ({
    chatId,
    onAttach,
    onClose,
}: Omit<RecordingSheetProps, 'ref'> & { onClose: () => void }) => {
    const { t } = useTranslation()
    const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'stopping' | 'ready'>(
        'idle'
    )
    const [recording, setRecording] = useState<Recording>()
    const mounted = useRef(true)
    const file = useRef<string | null>(null)
    const attached = useRef(false)
    const converting = useRef(false)
    const stopping = useRef(false)
    const error = useRef<string | null>(null)
    const finish = async (uri: string | null) => {
        try {
            await setAudioModeAsync({ allowsRecording: false })
        } finally {
            useAudioState.setState({ recording: false })
        }
        if (!mounted.current) {
            if (uri) deleteFile(uri)
            return
        }
        if (!uri) throw new Error(t('audio.recordFailed'))
        stopping.current = true
        setPhase('stopping')
        converting.current = true
        try {
            const converted = await convertAudioAttachment(
                uri,
                uri.split('/').pop() ?? 'recording.m4a'
            )
            file.current = converted.uri
            deleteFile(uri)
            if (!mounted.current) {
                deleteFile(converted.uri)
                return
            }
            setRecording(converted)
            setPhase('ready')
        } catch (error) {
            if (!mounted.current) deleteFile(uri)
            throw error
        } finally {
            converting.current = false
        }
    }
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
        if (status.hasError) error.current = status.error ?? t('audio.recordFailed')
        // Explicit stops finalize below; this also handles a stop initiated by the OS.
        if ((status.isFinished || status.hasError) && !stopping.current) {
            void finish(status.hasError ? null : status.url).catch((error) => {
                if (mounted.current) {
                    setPhase('idle')
                    Logger.errorToast(t('audio.recordFailed'), error)
                }
            })
        }
    })
    const state = useAudioRecorderState(recorder, 250)
    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
            // The recorder hook releases its native recorder when the sheet unmounts.
            void setAudioModeAsync({ allowsRecording: false })
                .catch(Logger.stackTrace)
                .finally(() => {
                    useAudioState.setState({ recording: false })
                })
            if (!attached.current && !converting.current && file.current) {
                stopAudioSource(file.current)
                deleteFile(file.current)
            }
        }
    }, [])
    const start = async () => {
        setPhase('starting')
        try {
            const permission = await requestRecordingPermissionsAsync()
            if (!mounted.current) return
            if (!permission.granted) {
                setPhase('idle')
                Logger.warnToast(t('audio.microphonePermission'))
                return
            }
            stopAudio()
            useAudioState.setState({ recording: true })
            await stopTTS()
            if (!mounted.current) return
            await setAudioModeAsync({
                allowsRecording: true,
                shouldPlayInBackground: false,
                playsInSilentMode: true,
                interruptionMode: 'doNotMix',
            })
            if (!mounted.current) return
            if (file.current) deleteFile(file.current)
            file.current = null
            setRecording(undefined)
            stopping.current = false
            error.current = null
            await recorder.prepareToRecordAsync()
            file.current = recorder.uri
            if (!mounted.current) {
                if (file.current) deleteFile(file.current)
                return
            }
            recorder.record()
            setPhase('recording')
        } catch (error) {
            await setAudioModeAsync({ allowsRecording: false }).catch(Logger.stackTrace)
            useAudioState.setState({ recording: false })
            if (mounted.current) {
                setPhase('idle')
                Logger.errorToast(t('audio.recordFailed'), error)
            }
        }
    }
    const stop = async () => {
        setPhase('stopping')
        stopping.current = true
        try {
            await recorder.stop()
            if (error.current) throw new Error(error.current)
            await finish(recorder.uri)
        } catch (error) {
            await setAudioModeAsync({ allowsRecording: false }).catch(Logger.stackTrace)
            useAudioState.setState({ recording: false })
            if (mounted.current) {
                setPhase('idle')
                Logger.errorToast(t('audio.recordFailed'), error)
            }
        }
    }
    const busy = phase === 'starting' || phase === 'stopping'
    const seconds = Math.floor(state.durationMillis / 1000)
    return (
        <View style={{ rowGap: 16 }}>
            <TText size={18}>{t('audio.record')}</TText>
            <TText
                color="400"
                style={{
                    textAlign: 'center',
                }}>{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}</TText>
            {recording && phase === 'ready' && (
                <AudioAttachment source={{ ...recording, chatId }} />
            )}
            {busy && <ThemedSpinner />}
            <ThemedButton
                variant="secondary"
                iconName={phase === 'recording' ? 'stop' : 'audio'}
                label={t(
                    phase === 'recording'
                        ? 'audio.stopRecording'
                        : phase === 'ready'
                          ? 'audio.recordAgain'
                          : 'audio.record'
                )}
                onPress={phase === 'recording' ? stop : start}
                level={phase === 'recording' ? 'error' : 'neutral'}
                disabled={busy}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedButton
                    variant="tertiary"
                    label={t('common.actions.cancel')}
                    onPress={onClose}
                />
                <ThemedButton
                    variant="secondary"
                    label={t('audio.attach')}
                    iconName="paper-clip"
                    onPress={() => {
                        if (!recording) return
                        stopAudio()
                        onAttach(recording)
                        attached.current = true
                        onClose()
                    }}
                    disabled={!(recording && phase === 'ready')}
                />
            </View>
        </View>
    )
}

const AudioRecordingSheet = ({ ref, chatId, onAttach }: RecordingSheetProps) => (
    <BottomSheet ref={ref} bodyContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>
        <RecordingControls
            chatId={chatId}
            onAttach={onAttach}
            onClose={() => ref.current?.close()}
        />
    </BottomSheet>
)
export default AudioRecordingSheet
