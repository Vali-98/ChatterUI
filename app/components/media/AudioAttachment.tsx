import { localDownload } from '@vali98/react-native-fs'
import { shareAsync } from 'expo-sharing'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import { pauseAudio, playAudio } from '@lib/audio/player'
import { useAudioState, type AudioSource } from '@lib/audio/state'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'

const AudioAttachment = ({ source }: { source: AudioSource }) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const [saving, setSaving] = useState(false)
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
                iconName="download"
                iconSize={24}
                disabled={saving}
                accessibilityLabel={t('common.actions.save')}
                onPress={async (event) => {
                    event.stopPropagation()
                    setSaving(true)
                    try {
                        if (Platform.OS === 'ios') await shareAsync(source.uri)
                        else {
                            await localDownload(source.uri.replace('file://', ''))
                            Logger.infoToast(t('audio.saved'))
                        }
                    } catch (error) {
                        Logger.errorToast(t('audio.saveFailed'), error)
                    } finally {
                        setSaving(false)
                    }
                }}
            />
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
