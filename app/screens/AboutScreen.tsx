import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import SupportButton from '@components/buttons/SupportButton'
import ThemedButton from '@components/buttons/ThemedButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import appConfig from 'app.config'

const AboutScreen = () => {
    const { t } = useTranslation()
    const styles = useStyles()
    const { spacing } = Theme.useTheme()
    const [counter, setCounter] = useState<number>(0)
    const [devMode, setDevMode] = useMMKVBoolean(AppSettings.DevMode)

    const updateCounter = () => {
        if (devMode) return
        if (counter === 6) {
            Logger.infoToast(t('about.devMode.enabledMessage'))
            setDevMode(true)
        }
        setCounter(counter + 1)
    }

    const version = t('about.versionPrefix') + appConfig.expo.version
    return (
        <View style={styles.container}>
            <HeaderTitle title={t('common.navigation.about')} />
            <TouchableOpacity activeOpacity={0.8} onPress={updateCounter}>
                <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
            </TouchableOpacity>

            <Text style={styles.titleText}>{t('common.brand.name')}</Text>
            <Text style={styles.subtitleText}>
                {t('common.labels.version')} {version}{' '}
                {devMode && `[${t('common.labels.devMode')}]`}
            </Text>
            {devMode && (
                <ThemedButton
                    label={t('about.devMode.disableAction')}
                    variant="critical"
                    buttonStyle={{
                        marginTop: spacing.xl,
                    }}
                    onPress={() => {
                        setCounter(0)
                        setDevMode(false)
                        Logger.info(t('about.devMode.disabledMessage'))
                    }}
                />
            )}

            <Text style={styles.body}>{t('about.description.primary')}</Text>
            <Text style={{ marginBottom: spacing.xl3, ...styles.body }}>
                {t('about.description.support')}
            </Text>
            <Text style={{ ...styles.body, marginBottom: spacing.m }}>
                {t('about.support.label')}
            </Text>

            <SupportButton />

            <Text style={styles.body}>{t('about.reportIssue')}</Text>
            <Text style={styles.subtitleText}>{t('about.logsReminder')}</Text>

            <ThemedButton
                buttonStyle={{ marginTop: spacing.m }}
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
}

export default AboutScreen

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()

    return StyleSheet.create({
        container: {
            paddingHorizontal: spacing.xl3,
            paddingBottom: spacing.xl2,
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
        },
        titleText: { color: color.text._100, fontSize: 32, marginTop: 16 },
        subtitleText: { color: color.text._400 },
        body: { color: color.text._100, marginTop: spacing.l, textAlign: 'center' },
        icon: {
            width: 120,
            height: 120,
            backgroundColor: 'black',

            borderRadius: 60,
        },
    })
}
