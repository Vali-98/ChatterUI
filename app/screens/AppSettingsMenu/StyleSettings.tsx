import ThemedButton from '@components/buttons/ThemedButton'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import { useBackgroundImage } from '@lib/state/BackgroundImage'
import { useRouter } from 'expo-router'
import React from 'react'
import { View } from 'react-native'

const StyleSettings = () => {
    const router = useRouter()

    const { chatBackground, importBackground, deleteBackground } = useBackgroundImage((state) => ({
        chatBackground: state.image,
        importBackground: state.importImage,
        deleteBackground: state.removeImage,
    }))

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Style</SectionTitle>

            <ThemedButton
                label="Change Theme"
                variant="secondary"
                onPress={() => router.push('/screens/AppSettingsMenu/ColorSelector')}
            />
            <ThemedButton
                label={chatBackground ? 'Replace Chat Background' : 'Import Chat Background'}
                variant="secondary"
                onPress={importBackground}
            />
            {chatBackground && (
                <ThemedButton
                    label="Delete Chat Background"
                    variant="critical"
                    onPress={() =>
                        Alert.alert({
                            title: 'Delete Background',
                            description:
                                'Are you sure you want to delete this background? This cannot be undone!',
                            buttons: [
                                { label: 'Cancel' },
                                {
                                    label: 'Delete Background',
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
