import ThemedButton from '@components/buttons/ThemedButton'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APIState } from '@lib/engine/API/APIManagerState'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { getDocumentAsync } from 'expo-document-picker'
import { readAsStringAsync } from 'expo-file-system'
import { Stack } from 'expo-router'
import { FlatList, Text, View } from 'react-native'

import TemplateItem from './TemplateItem'

const TemplateManager = () => {
    // eslint-disable-next-line react-compiler/react-compiler
    'use no memo'
    const { templates, addTemplate } = APIState.useAPIState((state) => ({
        templates: state.customTemplates,
        addTemplate: state.addTemplate,
    }))

    const { color, spacing } = Theme.useTheme()

    return (
        <View
            style={{
                paddingTop: spacing.xl,
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.xl2,
                flex: 1,
            }}>
            <Stack.Screen
                options={{
                    title: 'Template Manager',
                }}
            />
            {templates.length > 0 && (
                <FlatList
                    contentContainerStyle={{ rowGap: 4 }}
                    data={templates}
                    keyExtractor={(item, index) => item.name}
                    renderItem={({ item, index }) => <TemplateItem item={item} index={index} />}
                />
            )}

            {templates.length === 0 && (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <MaterialCommunityIcons
                        name="file-question-outline"
                        size={64}
                        color={color.text._700}
                    />
                    <Text
                        style={{
                            color: color.text._400,
                            fontStyle: 'italic',
                            marginTop: spacing.l,
                        }}>
                        No Custom Templates Added
                    </Text>
                </View>
            )}

            <ThemedButton
                onPress={async () => {
                    const result = await getDocumentAsync()
                    if (result.canceled) return

                    const uri = result.assets[0].uri
                    const data = await readAsStringAsync(uri, { encoding: 'utf8' })
                    try {
                        const jsonData = JSON.parse(data)
                        addTemplate(jsonData)
                    } catch (e) {
                        Logger.errorToast('Failed to Import')
                    }
                }}
                label="Add Template"
            />
        </View>
    )
}

export default TemplateManager
