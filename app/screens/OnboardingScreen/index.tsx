import { router, useFocusEffect, usePathname, Stack } from 'expo-router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, ScrollView, View, useColorScheme } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useConnectionStore } from '@lib/engine/API/connectionStore'
import { defaultTemplates } from '@lib/engine/API/DefaultAPI'
import { Model } from '@lib/engine/Local/Model'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { isConnectionReady } from '@lib/onboarding/connection'
import { useOnboardingStore } from '@lib/onboarding/store'
import { useAppModeStore } from '@lib/state/AppMode'
import { Characters } from '@lib/state/characters'
import { mmkv } from '@lib/storage/MMKV'
import { Theme } from '@lib/theme/ThemeManager'

import AppearanceSetup from './AppearanceSetup'
import AppModeSetup from './AppModeSetup'
import ConnectionSetup, { ConnectionDraft } from './ConnectionSetup'
import LocalSetup from './LocalSetup'
import PersonaSetup from './PersonaSetup'
import Welcome from './Welcome'

const OnboardingScreen = () => {
    const { t } = useTranslation()
    const pathname = usePathname()
    const { color } = Theme.useTheme()
    const onboarding = useOnboardingStore()
    const user = Characters.useUserStore((state) => state.card)
    const setCard = Characters.useUserStore((state) => state.setCard)
    const userImage = Characters.useUserStore((state) => state.getImageUri)
    const appMode = useAppModeStore((state) => state.appMode)
    const setAppMode = useAppModeStore((state) => state.setAppMode)
    const connections = useConnectionStore((state) => state.connections)
    const customTemplates = useConnectionStore((state) => state.customTemplates)
    const addConnection = useConnectionStore((state) => state.addConnection)
    const updateConnection = useConnectionStore((state) => state.updateConnection)
    const setActiveConnection = useConnectionStore((state) => state.setActiveConnection)
    const setLastModel = Llama.useLlamaPreferencesStore((state) => state.setLastModelLoaded)
    const lastModel = Llama.useLlamaPreferencesStore((state) => state.lastModel)
    const themes = Theme.useColorState()
    const system = useColorScheme()
    const [initialPersona] = useState({
        name: user?.name ?? 'User',
        description: user?.description ?? '',
    })
    const [name, setName] = useState(initialPersona.name)
    const [description, setDescription] = useState(initialPersona.description)
    const [avatar, setAvatar] = useState<string>()
    const [mode, setMode] = useState<'local' | 'remote'>(onboarding.step >= 3 ? appMode : 'remote')
    const [connection, setConnection] = useState<ConnectionDraft | undefined>(() =>
        connections.find((item) => item.id === onboarding.connectionId)
    )
    const [theme, setTheme] = useState(
        themes.useSystemDarkMode
            ? system === 'dark'
                ? themes.darkColor
                : themes.lightColor
            : themes.color
    )
    const [themeChosen, setThemeChosen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const { data: models } = useLiveQueryAsync(Model.getModelListQuery(), {
        key: ['onboarding-models'],
        watch: [{ table: 'model_data' }, { table: 'model_mmproj_links' }],
    })
    const availableModels = models.filter(
        (item) => !Model.isInitialEntry(item) && Model.getModelExists(item.file_path)
    )
    const step = onboarding.step
    // Subscribe to template changes while keeping the connection draft local.
    const template = [...defaultTemplates, ...customTemplates].find(
        (item) => item.name === connection?.configName
    )
    const personaComplete =
        !!name.trim() &&
        !!user &&
        (name !== initialPersona.name || description !== initialPersona.description || !!avatar)
    let complete = true
    switch (step) {
        case 1:
            complete = personaComplete
            break
        case 3:
            complete =
                mode === 'local'
                    ? availableModels.length > 0
                    : isConnectionReady(connection, template)
            break
    }
    useFocusEffect(
        useCallback(() => {
            const listener = BackHandler.addEventListener('hardwareBackPress', () => {
                if (step === 0) return false
                if (!saving) onboarding.setStep(step - 1)
                return true
            })
            return () => listener.remove()
        }, [step, saving, onboarding.setStep])
    )
    const next = async () => {
        if (saving) return
        setSaving(true)
        setError('')
        try {
            if (step === 1 && personaComplete && user) {
                await Characters.db.update.cardFields(user.id, { name: name.trim(), description })
                if (avatar) await Characters.actions.updateCardImage(user.id, avatar)
                await setCard(user.id)
            }
            if (step === 2) {
                setAppMode(mode)
                if (mode === 'local') mmkv.set(AppSettings.AutoLoadLocal, true)
            }
            if (step === 3 && mode === 'remote' && complete && connection) {
                const existing = connections.find((item) => item.id === onboarding.connectionId)
                if (existing) {
                    updateConnection(existing.id, connection)
                    setActiveConnection(existing.id)
                } else onboarding.setConnectionId(addConnection(connection))
            }
            if (step === 3 && mode === 'local' && availableModels.length) {
                setLastModel(
                    availableModels.find((item) => item.id === lastModel?.id) ?? availableModels[0]
                )
                mmkv.set(AppSettings.AutoLoadLocal, true)
            }
            if (step === 4 && themeChosen) {
                themes.setUseSystemDarkMode(false)
                themes.setColor(theme)
            }
            if (step === 5) {
                onboarding.complete()
                if (pathname !== '/') router.replace('/')
            } else onboarding.setStep(step + 1)
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error))
        } finally {
            setSaving(false)
        }
    }
    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <Welcome
                        onStart={() => {
                            void next()
                        }}
                        disabled={saving}
                    />
                )
            case 1:
                return (
                    <>
                        <TText size={28} style={{ fontWeight: '600', textAlign: 'center' }}>
                            {t('onboarding.persona')}
                        </TText>
                        <PersonaSetup
                            name={name}
                            description={description}
                            imageUri={avatar ?? userImage()}
                            onNameChange={setName}
                            onDescriptionChange={setDescription}
                            onImageChange={setAvatar}
                        />
                    </>
                )
            case 2:
                return <AppModeSetup mode={mode} onChange={setMode} />
            case 3:
                return (
                    <>
                        {(mode === 'remote' ? !complete : availableModels.length === 0) && (
                            <TText size={28} style={{ fontWeight: '600' }}>
                                {t(
                                    mode === 'remote'
                                        ? 'onboarding.remoteSetup'
                                        : 'onboarding.localSetup'
                                )}
                            </TText>
                        )}
                        {mode === 'remote' ? (
                            <ConnectionSetup value={connection} onChange={setConnection} />
                        ) : (
                            <LocalSetup models={availableModels} />
                        )}
                    </>
                )
            case 4:
                return (
                    <>
                        <TText size={28} style={{ fontWeight: '600' }}>
                            {t('onboarding.appearance')}
                        </TText>
                        <AppearanceSetup
                            selected={theme}
                            onSelect={(value) => {
                                setTheme(value)
                                setThemeChosen(true)
                            }}
                        />
                    </>
                )
            case 5:
                return (
                    <>
                        <TText size={28} style={{ fontWeight: '600', textAlign: 'center' }}>
                            {t('onboarding.ready')}
                        </TText>
                        <TText color="400" style={{ textAlign: 'center' }}>
                            {t('onboarding.readyDescription')}
                        </TText>
                    </>
                )
        }
    }
    let nextLabel = t('common.actions.next')
    if (step === 5) nextLabel = t('onboarding.finish')
    else if (!complete && step === 3) nextLabel = t('onboarding.later')
    else if (!complete) nextLabel = t('common.actions.skip')
    return (
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                <ScrollView
                    key={step}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingHorizontal: 24,
                        paddingTop: step === 0 ? 24 : 36,
                        paddingBottom: 24,
                        justifyContent:
                            step <= 2 ||
                            step === 5 ||
                            (step === 3 && complete)
                                ? 'center'
                                : 'flex-start',
                    }}>
                    <Animated.View
                        entering={FadeInUp.duration(250)}
                        style={{
                            gap: 24,
                            width: '100%',
                            maxWidth: step === 2 ? 340 : 520,
                            alignSelf: 'center',
                            flex: step === 2 ? 1 : undefined,
                        }}>
                        {renderStep()}
                        {!!error && <TText style={{ color: color.error._500 }}>{error}</TText>}
                    </Animated.View>
                </ScrollView>
                {step !== 0 && (
                    <View
                        style={{
                            padding: 20,
                            flexDirection: 'row',
                            justifyContent: step === 1 ? 'flex-end' : 'space-between',
                            alignItems: 'center',
                        }}>
                        {step > 1 && (
                            <ThemedButton
                                label={t('common.actions.back', { defaultValue: 'Back' })}
                                variant="tertiary"
                                buttonStyle={{
                                    minHeight: 44,
                                    minWidth: 92,
                                    paddingHorizontal: 20,
                                    justifyContent: 'center',
                                }}
                                labelStyle={{ fontSize: 17, color: color.text._500 }}
                                disabled={saving}
                                onPress={() => onboarding.setStep(step - 1)}
                            />
                        )}
                        <ThemedButton
                            label={nextLabel}
                            variant={complete ? 'secondary' : 'tertiary'}
                            buttonStyle={{
                                minHeight: 44,
                                minWidth: 108,
                                paddingHorizontal: 20,
                                justifyContent: 'center',
                                borderRadius: 14,
                            }}
                            labelStyle={{ fontSize: 17 }}
                            disabled={saving}
                            onPress={() => {
                                void next()
                            }}
                        />
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
export default OnboardingScreen
