import { usePathname } from 'expo-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import IconButton from '@components/buttons/IconButton'
import AudioControls from '@components/media/AudioControls'
import { observeAudioPlayback, setAudioChatScope, stopAudio } from '@lib/audio/player'
import { useAudioState } from '@lib/audio/state'
import { Chats } from '@lib/state/chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { jumpToTTSSource } from '@lib/tts/actions'
import { observeGenerationTTS } from '@lib/tts/generationBridge'
import { replayTTS, setTTSChatVisible, stopTTS } from '@lib/tts/player'
import { useTTSState } from '@lib/tts/state'

import PlaybackOverlay from './PlaybackOverlay'

const PlaybackPlayer = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const session = useTTSState(
        useShallow((state) =>
            state.session
                ? {
                      id: state.session.id,
                      name: state.session.name,
                      kind: state.session.kind,
                      messageId: state.session.messageId,
                      status: state.session.status,
                  }
                : undefined
        )
    )
    const audioId = useAudioState((state) => state.session?.id)
    const chatId = Chats.useChatState((state) => state.id)
    const isChat = usePathname() === '/chat'
    useEffect(() => {
        setTTSChatVisible(isChat)
        setAudioChatScope(isChat ? chatId : undefined)
    }, [isChat, chatId])
    useEffect(() => {
        const unsubscribeTTS = observeGenerationTTS()
        const unsubscribeAudio = observeAudioPlayback()
        return () => {
            unsubscribeTTS()
            unsubscribeAudio()
            void stopTTS()
            stopAudio()
        }
    }, [])
    return (
        <PlaybackOverlay id={audioId !== undefined ? `audio-${audioId}` : session?.id}>
            {audioId !== undefined ? (
                <AudioControls />
            ) : session ? (
                <>
                    <Animated.Text
                        entering={ZoomIn.duration(200)}
                        exiting={ZoomOut.duration(200)}
                        numberOfLines={1}
                        style={{
                            color: color.text._400,
                            fontSize: 13,
                            lineHeight: 18,
                            flexShrink: 1,
                            maxWidth: 160,
                        }}>
                        {session.name ??
                            t(session.kind === 'preview' ? 'tts.preview' : 'tts.player')}
                    </Animated.Text>
                    {session.messageId !== undefined && (
                        <Animated.View
                            entering={ZoomIn.duration(200)}
                            exiting={ZoomOut.duration(200)}>
                            <IconButton
                                variant="tertiary"
                                iconName={{ name: 'message', subIcon: 'arrow-right' }}
                                iconSize={24}
                                accessibilityLabel={t('tts.jumpToMessage')}
                                onPress={() => {
                                    void jumpToTTSSource().catch(Logger.stackTrace)
                                }}
                            />
                        </Animated.View>
                    )}
                    {session.status === 'finished' && (
                        <Animated.View
                            entering={ZoomIn.duration(200)}
                            exiting={ZoomOut.duration(200)}>
                            <IconButton
                                variant="tertiary"
                                iconName="reload"
                                iconSize={24}
                                accessibilityLabel={t('tts.replay')}
                                onPress={replayTTS}
                            />
                        </Animated.View>
                    )}
                    <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                        <IconButton
                            variant="tertiary"
                            iconName={
                                session.status === 'finished' || session.status === 'failed'
                                    ? 'close'
                                    : { family: 'octicons', name: 'mute' }
                            }
                            level={
                                session.status === 'finished' || session.status === 'failed'
                                    ? 'neutral'
                                    : 'error'
                            }
                            accessibilityLabel={t(
                                session.status === 'finished' || session.status === 'failed'
                                    ? 'common.actions.close'
                                    : 'tts.stop'
                            )}
                            onPress={() => {
                                void stopTTS()
                            }}
                        />
                    </Animated.View>
                </>
            ) : null}
        </PlaybackOverlay>
    )
}
export default PlaybackPlayer
