import { Href, Stack, useRouter } from 'expo-router'
import React, { ReactNode } from 'react'
import { View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import ThemedButton from '@components/buttons/ThemedButton'
import HeaderTitle from '@components/views/HeaderTitle'

type OnboardNavigationProps = {
    next?: Href
    canSkip?: boolean
    canContinue?: boolean
    canGoBack?: boolean
    nextLabel?: string
}

const OnboardNavigation: React.FC<OnboardNavigationProps> = ({
    next = '/',
    canContinue = true,
    canSkip = false,
    canGoBack = true,
    nextLabel = 'Next',
}) => {
    const router = useRouter()

    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
                {canGoBack && (
                    <ThemedButton
                        variant="tertiary"
                        onPress={() => {
                            router.back()
                        }}
                        label="Back"
                    />
                )}
            </View>
            <View>
                <ThemedButton
                    disabled={!canContinue}
                    variant={!canContinue ? 'disabled' : 'secondary'}
                    onPress={() => {
                        if (!canContinue && !canSkip) return
                        router.push(next)
                    }}
                    label={nextLabel}
                />
            </View>
        </View>
    )
}

const OnboardingView: React.FC<OnboardNavigationProps & { children?: ReactNode }> = ({
    children,
    ...rest
}) => {
    const insets = useSafeAreaInsets()
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={'padding'}
            keyboardVerticalOffset={insets.bottom}>
            <SafeAreaView style={{ padding: 16, flex: 1 }}>
                <HeaderTitle />
                <Stack.Screen.BackButton hidden />
                <Animated.View
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    entering={FadeInUp.delay(400).duration(500)}>
                    {children}
                </Animated.View>
                <OnboardNavigation {...rest} />
            </SafeAreaView>
        </KeyboardAvoidingView>
    )
}

export default OnboardingView
