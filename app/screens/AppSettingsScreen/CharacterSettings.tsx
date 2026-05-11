import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import { Characters } from '@lib/state/Characters'

import TagHiderSettings from './TagHiderSettings'

const CharacterSettings = () => {
    const { t } = useTranslation()

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.character.title')}</SectionTitle>
            <ThemedButton
                label={t('settings.character.regenerateDefaultCard')}
                variant="secondary"
                onPress={() => {
                    Alert.alert({
                        title: t('settings.character.alert.regenerateDefaultCard.title'),
                        description: t(
                            'settings.character.alert.regenerateDefaultCard.description'
                        ),
                        buttons: [
                            { label: t('common.cancel') },
                            {
                                label: t('settings.character.alert.regenerateDefaultCard.confirm'),
                                onPress: async () => await Characters.createDefaultCard(),
                            },
                        ],
                    })
                }}
            />
            <TagHiderSettings />
        </View>
    )
}

export default CharacterSettings
