import { useTranslation } from 'react-i18next'
import { Platform, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import HorizontalSelector from '@components/input/HorizontalSelector'
import TText from '@components/text/TText'

type AppMode = 'local' | 'remote'

const AppModeSetup = ({ mode, onChange }: { mode: AppMode; onChange: (mode: AppMode) => void }) => {
    const { t } = useTranslation()
    return (
        <View style={{ flex: 1, minHeight: 520, justifyContent: 'center' }}>
            <View>
                <View
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        paddingBottom: 28,
                    }}>
                    <TText size={28} style={{ fontWeight: '600', textAlign: 'center' }}>
                        {t('onboarding.mode')}
                    </TText>
                </View>
                <HorizontalSelector
                    itemStyle={{ flexDirection: 'column', paddingVertical: 28, rowGap: 16 }}
                    labelStyle={{ fontSize: 18 }}
                    values={[
                        {
                            value: 'local' as const,
                            label: t('appMode.options.local'),
                            icon: Platform.OS === 'android' ? 'phone-android' : 'phone-iphone',
                            iconSize: 56,
                        },
                        {
                            value: 'remote' as const,
                            label: t('appMode.options.remote'),
                            icon: 'cloud-queue',
                            iconSize: 56,
                        },
                    ]}
                    selected={mode}
                    onPress={onChange}
                />
                <View
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        paddingTop: 28,
                        gap: 24,
                    }}>
                    <Animated.View key={mode} entering={FadeIn.duration(250)}>
                        <TText size={16} color="300">
                            {t(
                                mode === 'local'
                                    ? 'onboarding.localDescription'
                                    : 'onboarding.remoteDescription'
                            )}
                        </TText>
                    </Animated.View>
                    <TText color="400">{t('onboarding.modeLater')}</TText>
                </View>
            </View>
        </View>
    )
}
export default AppModeSetup
