import { useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import { useBackgroundStore } from '@lib/state/BackgroundImage'

const StyleSettings = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const { chatBackground, importBackground, deleteBackground } = useBackgroundStore(
        useShallow((state) => ({
            chatBackground: state.image,
            importBackground: state.importImage,
            deleteBackground: state.removeImage,
        }))
    )

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.style.title')}</SectionTitle>

            <ThemedButton
                label={t('settings.style.changeTheme')}
                variant="secondary"
                onPress={() => router.push('/screens/AppSettingsScreen/ColorSelector')}
            />
            <ThemedButton
                label={
                    chatBackground
                        ? t('settings.style.replaceBackground')
                        : t('settings.style.importBackground')
                }
                variant="secondary"
                onPress={importBackground}
            />
            {chatBackground && (
                <ThemedButton
                    label={t('settings.style.deleteBackground')}
                    variant="critical"
                    onPress={() =>
                        Alert.alert({
                            title: t('settings.style.alert.deleteBackground.title'),
                            description: t('settings.style.alert.deleteBackground.description'),
                            buttons: [
                                { label: t('common.cancel') },
                                {
                                    label: t('settings.style.alert.deleteBackground.confirm'),
                                    type: 'warning',
                                    onPress: deleteBackground,
                                },
                            ],
                        })
                    }
                />
            )}
        </View>
    )
}

export default StyleSettings
