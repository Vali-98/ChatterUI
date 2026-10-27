import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import { pauseAudio, playAudio } from '@lib/audio/player'
import { useAudioState, type AudioSource } from '@lib/audio/state'
import { Theme } from '@lib/theme/ThemeManager'

const AudioAttachment = ({ source }: { source: AudioSource }) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const status = useAudioState((state) =>
        state.session?.uri === source.uri ? state.session.status : undefined
    )
    const playing = status === 'playing' || status === 'loading'
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: 12,
                paddingRight: 12,
                paddingLeft: 16,
                paddingVertical: 6,
                borderRadius: 24,
                backgroundColor: color.neutral._100,
                borderWidth: 1,
                borderColor: color.primary._300,
            }}>
            <TText numberOfLines={1} ellipsizeMode="middle" style={{ flex: 1 }}>
                {source.name}
            </TText>
            <ThemedButton
                variant="tertiary"
                iconName={playing ? 'pause-circle' : 'play-circle'}
                iconSize={24}
                accessibilityLabel={t(playing ? 'audio.pause' : 'audio.play')}
                onPress={(event) => {
                    event.stopPropagation()
                    if (playing) pauseAudio()
                    else void playAudio(source)
                }}
            />
        </View>
    )
}
export default AudioAttachment
