import ThemedButton from '@components/buttons/ThemedButton'
import SectionTitle from '@components/text/SectionTitle'
import { useRouter } from 'expo-router'
import React from 'react'
import { View } from 'react-native'

const StyleSettings = () => {
    const router = useRouter()
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Style</SectionTitle>

            <ThemedButton
                label="Change Theme"
                variant="secondary"
                onPress={() => router.push('/screens/AppSettingsMenu/ColorSelector')}
            />
        </View>
    )
}

export default StyleSettings
