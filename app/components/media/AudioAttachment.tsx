import { localDownload } from '@vali98/react-native-fs'
import { shareAsync } from 'expo-sharing'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, View } from 'react-native'
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated'

import IconButton from '@components/buttons/IconButton'
import TText from '@components/text/TText'
import { playAudio } from '@lib/audio/player'
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
    const active = playing || status === 'paused'
    const opacity = useSharedValue(1)
    useEffect(() => {
        opacity.set(playing ? withRepeat(withTiming(0.45, { duration: 650 }), -1, true) : 1)
        return () => cancelAnimation(opacity)
    }, [playing, opacity])
    const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }))
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

            <IconButton
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
            <Animated.View style={pulse}>
                <IconButton
                    variant="tertiary"
                    iconName="play-circle"
                    iconSize={24}
                    level="primary"
                    disabled={active}
                    accessibilityLabel={t('audio.play')}
                    accessibilityState={{ disabled: active, busy: playing }}
                    onPress={(event) => {
                        event.stopPropagation()
                        void playAudio(source)
                    }}
                />
            </Animated.View>
        </View>
    )
}
export default AudioAttachment
