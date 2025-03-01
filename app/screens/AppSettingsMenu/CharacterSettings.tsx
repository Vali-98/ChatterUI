import ThemedButton from '@components/buttons/ThemedButton'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import { Characters } from '@lib/state/Characters'
import React from 'react'
import { View } from 'react-native'

const CharacterSettings = () => {
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Character Management</SectionTitle>
            <ThemedButton
                label="Regenerate Default Card"
                variant="secondary"
                onPress={() => {
                    Alert.alert({
                        title: `Regenerate Default Card`,
                        description: `This will add the default AI Bot card to your character list.`,
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Create Default Card', onPress: Characters.createDefaultCard },
                        ],
                    })
                }}
            />
        </View>
    )
}

export default CharacterSettings
