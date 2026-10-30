import { useFocusEffect, useNavigation } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, Keyboard, View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import Spotlight from '@components/views/Spotlight'
import { guides, type GuideId, type GuideStep, type GuideTargetId } from '@lib/guides/definitions'
import { useGuideState } from '@lib/guides/state'
import { useOnboardingStore } from '@lib/onboarding/store'
import { Theme } from '@lib/theme/ThemeManager'

const GuideHost = ({ id, enabled = true }: { id: GuideId; enabled?: boolean }) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const navigation = useNavigation()
    const [focused, setFocused] = useState(false)
    const [closing, setClosing] = useState(false)
    const status = useOnboardingStore((state) => state.status)
    const origin = useOnboardingStore((state) => state.origin)
    const active = useGuideState((state) => state.active)
    const targets = useGuideState((state) => state.targets)
    const start = useGuideState((state) => state.start)
    const stop = useGuideState((state) => state.stop)
    const next = useGuideState((state) => state.next)
    const back = useGuideState((state) => state.back)
    const skip = useGuideState((state) => state.skip)
    const forced = useGuideState((state) => state.forced)
    useFocusEffect(
        useCallback(() => {
            setClosing(false)
            setFocused(true)
            return () => {
                setFocused(false)
                stop(id)
            }
        }, [id, stop])
    )
    useEffect(() => {
        if (!focused || !enabled) {
            stop(id)
            return
        }
        if (!active) start(id, { origin, onboardingComplete: status === 'complete' })
    }, [focused, enabled, active, id, origin, status, start, stop, forced])
    const running = active?.id === id && focused && enabled
    useEffect(() => {
        if (!running) return
        Keyboard.dismiss()
        navigation.setOptions({ gestureEnabled: false })
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
        return () => {
            subscription.remove()
            navigation.setOptions({ gestureEnabled: true })
        }
    }, [running, navigation])
    const finish = useCallback(() => {
        skip()
        setClosing(false)
    }, [skip])
    if (!running || !active) return null
    const definition = guides[id]
    const step: GuideStep = definition.steps[active.step]
    const target = step.target ? targets[step.target as GuideTargetId] : undefined
    const last = active.step === definition.steps.length - 1
    return (
        <Spotlight
            portalName={`guide-${id}`}
            visible
            closing={closing}
            onCloseComplete={finish}
            targetRef={target}
            centered={!step.target}
            description={t(step.description)}
            placement={step.placement}
            gap={step.gap}
            allowOverlap={step.allowOverlap}
            onDismiss={() => setClosing(true)}
            blockInteraction
            progress={{ index: active.step, count: definition.steps.length }}
            controls={
                <View
                    pointerEvents={closing ? 'none' : 'auto'}
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                    <ThemedButton
                        variant="tertiary"
                        label={t('guides.skip')}
                        onPress={() => setClosing(true)}
                        labelStyle={{ color: color.text._400 }}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {active.step > 0 && (
                            <ThemedButton
                                variant="tertiary"
                                label={t('common.actions.back', { defaultValue: 'Back' })}
                                onPress={back}
                            />
                        )}
                        <ThemedButton
                            variant="secondary"
                            label={t(last ? 'common.actions.done' : 'common.actions.next')}
                            disabled={!!step.target && !target}
                            onPress={last ? () => setClosing(true) : next}
                        />
                    </View>
                </View>
            }
        />
    )
}
export default GuideHost
