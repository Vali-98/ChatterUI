import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { SplashScreen, Stack } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { db } from '@db/db'
import { prepareOnboarding, useOnboardingStore } from '@lib/onboarding/store'
import useLocalAuth from '@lib/hooks/LocalAuth'
import { Theme } from '@lib/theme/ThemeManager'
import { loadChatOnInit, startupApp, useTextIntentFocus } from '@lib/utils/Startup'
import CharacterList from '@screens/CharacterListScreen'
import OnboardingScreen from '@screens/OnboardingScreen'

import migrations from '../db/migrations/migrations'

const useStartupRoutine = () => {
    const { success, error } = useMigrations(db, migrations)
    const [ready, setReady] = useState(false)
    const [startupError, setStartupError] = useState<Error>()
    const { authorized, retry } = useLocalAuth()
    const onboardingStatus = useOnboardingStore((state) => state.status)
    const onboardingStep = useOnboardingStore((state) => state.step)
    const initialChatHandled = useRef(false)

    useTextIntentFocus()

    useEffect(() => {
        if (!authorized || !ready || initialChatHandled.current) return
        initialChatHandled.current = true
        if (onboardingStatus === 'complete') void loadChatOnInit()
    }, [authorized, ready, onboardingStatus])

    useEffect(() => {
        if (!ready) return
        // Welcome hides the native splash only after its matching black overlay is painted.
        if (authorized && onboardingStatus === 'inProgress' && onboardingStep === 0) return
        void SplashScreen.hideAsync()
    }, [ready, authorized, onboardingStatus, onboardingStep])

    useEffect(() => {
        /**
         * Startup Routine:
         * - wait for useMigration success
         * - startupApp() - creates defaults
         */
        if (success) {
            let active = true
            void prepareOnboarding()
                .then(() => startupApp())
                .then(() => {
                    if (active) setReady(true)
                })
                .catch((error) => {
                    void SplashScreen.hideAsync()
                    if (active)
                        setStartupError(error instanceof Error ? error : new Error(String(error)))
                })
            return () => {
                active = false
            }
        }
        if (error) SplashScreen.hideAsync()
    }, [success, error])

    return {
        authorized: authorized,
        retry: retry,
        error: error ?? startupError,
        success: success && ready,
    }
}

const Home = () => {
    const { color } = Theme.useTheme()
    const styles = useStyles()
    const { authorized, retry, error, success } = useStartupRoutine()
    const { t } = useTranslation()
    const onboardingStatus = useOnboardingStore((state) => state.status)
    if (error)
        return (
            <View style={styles.centeredContainer}>
                <HeaderTitle />
                <Text style={styles.title}>{t('db.migrationerror.title')}</Text>
                <Text style={styles.errorLog}>{error.message}</Text>
                <Text style={styles.subtitle}>{t('db.migrationerror.description')}</Text>
                <Text style={styles.subtitle} />
                <ThemedButton
                    variant="secondary"
                    label="Github"
                    iconName="github"
                    iconSize={20}
                    onPress={() => {
                        Linking.openURL('https://github.com/Vali-98/ChatterUI')
                    }}
                />
            </View>
        )

    if (!authorized)
        return (
            <View style={[styles.centeredContainer, { rowGap: 60 }]}>
                <HeaderTitle />
                <AntDesign
                    name="lock"
                    size={120}
                    style={{ marginBottom: 12 }}
                    color={color.text._500}
                />
                <Text style={styles.title}>{t('auth.authorizationRequired')}</Text>
                <TouchableOpacity onPress={retry} style={styles.button}>
                    <Text style={styles.buttonText}>{t('common.actions.tryAgain')}</Text>
                </TouchableOpacity>
            </View>
        )

    if (success && onboardingStatus === 'inProgress') return <OnboardingScreen />
    if (success)
        return (
            <>
                <Stack.Screen options={{ headerShown: true }} />
                <CharacterList />
            </>
        )
    return <HeaderTitle />
}

export default Home

const useStyles = () => {
    const { color, spacing, fontSize, borderWidth } = Theme.useTheme()
    return StyleSheet.create({
        centeredContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },

        title: {
            color: color.text._300,
            fontSize: fontSize.xl2,
        },

        subtitle: {
            color: color.text._400,
            marginHorizontal: 24,
            textAlign: 'center',
        },

        errorLog: {
            color: color.text._400,
            fontSize: fontSize.s,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.l,
            borderRadius: 12,
            margin: spacing.xl2,
            backgroundColor: 'black',
        },

        buttonText: {
            color: color.text._100,
        },

        button: {
            paddingVertical: spacing.l,
            paddingHorizontal: spacing.xl2,
            columnGap: spacing.m,
            borderRadius: spacing.xl2,
            borderWidth: borderWidth.m,
            borderColor: color.primary._500,
        },
    })
}
