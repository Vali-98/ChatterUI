import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, View } from 'react-native'
import Animated, {
    Easing,
    useAnimatedRef,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import { Theme } from '@lib/theme/ThemeManager'

import WelcomeIntro from './WelcomeIntro'

const useBubbleEntrance = (visible: boolean, delay: number) => {
    const progress = useSharedValue(0)
    useEffect(() => {
        if (visible)
            progress.value = withDelay(
                delay,
                withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) })
            )
    }, [visible, delay, progress])
    return useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: 24 * (1 - progress.value) }],
    }))
}

const Welcome = ({ onStart, disabled }: { onStart: () => void; disabled: boolean }) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const iconTarget = useAnimatedRef<View>()
    const bubbleTarget = useAnimatedRef<View>()
    const [introFinished, setIntroFinished] = useState(false)
    const finishIntro = useCallback(() => setIntroFinished(true), [])
    const welcomeStyle = useBubbleEntrance(introFinished, 150)
    const taglineStyle = useBubbleEntrance(introFinished, 1150)
    const capabilitiesStyle = useBubbleEntrance(introFinished, 2150)
    const startStyle = useBubbleEntrance(introFinished, 3250)
    return (
        <View style={{ gap: 18 }}>
            {!introFinished && (
                <WelcomeIntro
                    target={iconTarget}
                    bubbleTarget={bubbleTarget}
                    onComplete={finishIntro}
                />
            )}
            <Animated.View
                ref={bubbleTarget}
                collapsable={false}
                style={{
                    alignSelf: 'flex-end',
                    padding: 12,
                    borderRadius: 24,
                    borderTopRightRadius: 6,
                    backgroundColor: '#000',
                }}>
                <Animated.View
                    ref={iconTarget}
                    collapsable={false}
                    style={{ width: 80, height: 80, opacity: introFinished ? 1 : 0 }}>
                    <Image
                        source={require('../../assets/images/icon.png')}
                        style={{ width: 80, height: 80, borderRadius: 20 }}
                    />
                </Animated.View>
            </Animated.View>
            <Animated.View
                style={[
                    {
                        alignSelf: 'flex-start',
                        maxWidth: '92%',
                        padding: 22,
                        borderRadius: 24,
                        borderTopLeftRadius: 6,
                        backgroundColor: color.neutral._200,
                    },
                    welcomeStyle,
                ]}>
                <TText size={34} style={{ fontWeight: '700', lineHeight: 42 }}>
                    {t('onboarding.welcome')}
                </TText>
            </Animated.View>
            <Animated.View
                style={[
                    {
                        alignSelf: 'flex-end',
                        maxWidth: '92%',
                        padding: 22,
                        borderRadius: 24,
                        borderTopRightRadius: 6,
                        backgroundColor: color.primary._300,
                    },
                    taglineStyle,
                ]}>
                <TText size={20} style={{ lineHeight: 18 }}>
                    {t('onboarding.tagline')}
                </TText>
            </Animated.View>
            <Animated.View
                style={[
                    {
                        alignSelf: 'flex-start',
                        maxWidth: '92%',
                        paddingHorizontal: 22,
                        paddingVertical: 16,
                        borderRadius: 24,
                        borderTopLeftRadius: 6,
                        backgroundColor: color.neutral._200,
                    },
                    capabilitiesStyle,
                ]}>
                <TText color="400" size={17} style={{ lineHeight: 18 }}>
                    {t('onboarding.capabilities')}
                </TText>
            </Animated.View>
            <Animated.View style={[{ alignSelf: 'flex-end' }, startStyle]}>
                <ThemedButton
                    label={t('onboarding.start')}
                    variant="secondary"
                    iconName="right"
                    disabled={disabled || !introFinished}
                    onPress={onStart}
                    viewStyle={{
                        paddingHorizontal: 24,
                        minHeight: 50,
                        justifyContent: 'center',
                        borderRadius: 20,
                        borderTopRightRadius: 0,
                    }}
                    labelStyle={{ fontSize: 20, fontWeight: '600' }}
                />
            </Animated.View>
        </View>
    )
}
export default Welcome
