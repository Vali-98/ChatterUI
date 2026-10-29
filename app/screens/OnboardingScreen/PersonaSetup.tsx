import { launchImageLibraryAsync } from 'expo-image-picker'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import TText from '@components/text/TText'
import Avatar from '@components/views/Avatar'
import { Theme } from '@lib/theme/ThemeManager'

type PersonaSetupProps = {
    name: string
    description: string
    imageUri: string
    onNameChange: (name: string) => void
    onDescriptionChange: (description: string) => void
    onImageChange: (uri: string) => void
}

const PersonaSetup = ({
    name,
    description,
    imageUri,
    onNameChange,
    onDescriptionChange,
    onImageChange,
}: PersonaSetupProps) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const [descriptionVisible, setDescriptionVisible] = useState(!!description)
    const chooseAvatar = async () => {
        const result = await launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
        })
        if (!result.canceled) onImageChange(result.assets[0].uri)
    }
    return (
        <View style={{ gap: 24 }}>
            <TText color="400" style={{ textAlign: 'center' }}>
                {t('onboarding.personaDescription')}
            </TText>
            <Pressable
                onPress={() => {
                    void chooseAvatar()
                }}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.chooseAvatar')}
                style={{ alignSelf: 'center', padding: 8 }}>
                <Avatar
                    targetImage={imageUri}
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        borderWidth: 2,
                        borderColor: color.primary._500,
                    }}
                />
            </Pressable>
            <ThemedTextInput
                containerStyle={{ flex: 0, width: '70%', maxWidth: 280, alignSelf: 'center' }}
                label={t('common.labels.name')}
                placeholder={t('onboarding.namePlaceholder')}
                value={name}
                onChangeText={onNameChange}
            />
            <Animated.View layout={LinearTransition}>
                {descriptionVisible ? (
                    <Animated.View entering={FadeIn}>
                        <ThemedTextInput
                            containerStyle={{ flex: 0 }}
                            label={t('onboarding.description')}
                            placeholder={t('onboarding.descriptionPlaceholder')}
                            value={description}
                            onChangeText={onDescriptionChange}
                            numberOfLines={4}
                            multiline
                        />
                    </Animated.View>
                ) : (
                    <ThemedButton
                        variant="secondary"
                        iconName="plus"
                        label={t('onboarding.addDescription')}
                        onPress={() => setDescriptionVisible(true)}
                        viewStyle={{ alignSelf: 'center' }}
                    />
                )}
            </Animated.View>
            <TText color="400" style={{ textAlign: 'center' }}>
                {t('onboarding.personaLater')}
            </TText>
        </View>
    )
}
export default PersonaSetup
