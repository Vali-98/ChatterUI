import HeaderTitle from '@components/views/HeaderTitle'
import { db } from '@db'
import { AntDesign } from '@expo/vector-icons'
import useLocalAuth from '@lib/hooks/LocalAuth'
import { Theme } from '@lib/theme/ThemeManager'
import { loadChatOnInit, startupApp } from '@lib/utils/Startup'
import CharacterMenu from '@screens/CharacterMenu'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { SplashScreen } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import migrations from '../db/migrations/migrations'

const Home = () => {
    const { color } = Theme.useTheme()
    const styles = useStyles()
    const { success, error } = useMigrations(db, migrations)
    const { authorized, retry } = useLocalAuth()

    const [firstRender, setFirstRender] = useState<boolean>(true)

    useEffect(() => {
        if (authorized && success) {
            loadChatOnInit()
        }
    }, [authorized])

    useEffect(() => {
        /**
         * Startup Routine:
         * - wait for useMigration success
         * - startupApp() - creates defaults
         */
        if (success) {
            startupApp()
            setFirstRender(false)
            SplashScreen.hideAsync()
        }
    }, [success])

    if (error)
        return (
            <View style={styles.centeredContainer}>
                <HeaderTitle />
                <Text style={styles.title}>Database Migration Failed!</Text>
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
                <Text style={styles.title}>Authentication Required</Text>
                <TouchableOpacity onPress={retry} style={styles.button}>
                    <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        )
    if (!firstRender && success) return <CharacterMenu />
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
