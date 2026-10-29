import Slider from '@react-native-community/slider'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated'

import IconButton from '@components/buttons/IconButton'
import TText from '@components/text/TText'
import ThemedSpinner from '@components/views/ThemedSpinner'
import { pauseAudio, resumeAudio, seekAudio, stopAudio } from '@lib/audio/player'
import { useAudioState } from '@lib/audio/state'
import { Theme } from '@lib/theme/ThemeManager'

const time = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
const AudioControls = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const session = useAudioState((state) => state.session)
    const [dragging, setDragging] = useState(false)
    const [position, setPosition] = useState(0)
    if (!session) return null
    const playing = session.status === 'playing'
    return (
        <>
            <View
                style={{
                    width: 210,
                    flexShrink: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    columnGap: 8,
                }}>
                <TText color="400" size={10} numberOfLines={1}>
                    {session.status === 'failed'
                        ? t('audio.playbackFailed')
                        : `${time(dragging ? position : session.currentTime)} / ${time(session.duration)}`}
                </TText>
                <Slider
                    accessibilityLabel={t('audio.seek')}
                    minimumValue={0}
                    maximumValue={session.duration || 1}
                    value={dragging ? position : session.currentTime}
                    disabled={!session.duration || session.status === 'failed'}
                    minimumTrackTintColor={color.primary._400}
                    maximumTrackTintColor={color.neutral._400}
                    thumbTintColor={color.primary._500}
                    style={{ height: 24, flex: 1 }}
                    onSlidingStart={(value) => {
                        setPosition(value)
                        setDragging(true)
                    }}
                    onValueChange={setPosition}
                    onSlidingComplete={(value) => {
                        setDragging(false)
                        void seekAudio(value)
                    }}
                />
            </View>
            <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                {session.status === 'loading' ? (
                    <ThemedSpinner />
                ) : (
                    <IconButton
                        variant="tertiary"
                        iconName={
                            playing
                                ? 'pause-circle'
                                : session.status === 'finished'
                                  ? 'reload'
                                  : 'play-circle'
                        }
                        iconSize={24}
                        accessibilityLabel={t(
                            playing
                                ? 'audio.pause'
                                : session.status === 'finished'
                                  ? 'audio.replay'
                                  : 'audio.play'
                        )}
                        onPress={() => {
                            if (playing) pauseAudio()
                            else void resumeAudio()
                        }}
                    />
                )}
            </Animated.View>
            <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                <IconButton
                    variant="tertiary"
                    iconName={{
                        family: 'material',
                        name:
                            session.status === 'finished' || session.status === 'failed'
                                ? 'close'
                                : 'stop',
                    }}
                    level={
                        session.status === 'finished' || session.status === 'failed'
                            ? 'neutral'
                            : 'error'
                    }
                    accessibilityLabel={t('audio.stop')}
                    onPress={stopAudio}
                />
            </Animated.View>
        </>
    )
}
export default AudioControls
