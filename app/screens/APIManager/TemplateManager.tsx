import ThemedButton from '@components/buttons/ThemedButton'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APIState } from '@lib/engine/API/APIManagerState'
import { Style } from '@lib/theme/Style'
import { Logger } from '@lib/utils/Global'
import { getDocumentAsync } from 'expo-document-picker'
import { readAsStringAsync } from 'expo-file-system'
import { Stack } from 'expo-router'
import { FlatList, StyleSheet, Text, View } from 'react-native'

import TemplateItem from './TemplateItem'

const TemplateManager = () => {
    // eslint-disable-next-line react-compiler/react-compiler
    'use no memo'
    const { templates, addTemplate } = APIState.useAPIState((state) => ({
        templates: state.customTemplates,
        addTemplate: state.addTemplate,
    }))

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    title: 'Template Manager',
                }}
            />
            {templates.length > 0 && (
                <FlatList
                    data={templates}
                    keyExtractor={(item, index) => item.name}
                    renderItem={({ item, index }) => <TemplateItem item={item} index={index} />}
                />
            )}

            {templates.length === 0 && (
                <View style={styles.emptyListContainer}>
                    <MaterialCommunityIcons
                        name="file-question-outline"
                        size={64}
                        color={Style.getColor('primary-text3')}
                    />
                    <Text style={styles.emptyListText}>No Custom Templates Added</Text>
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
                        Logger.log('Failed to Import', true)
                    }
                }}
                label="Add Template"
            />
        </View>
    )
}

export default TemplateManager

const styles = StyleSheet.create({
    mainContainer: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
        flex: 1,
    },

    emptyListContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyListText: {
        color: Style.getColor('primary-text2'),
        fontStyle: 'italic',
        marginTop: 12,
    },

    title: {
        paddingTop: 8,
        color: Style.getColor('primary-text1'),
        fontSize: 16,
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
    },

    input: {
        flex: 1,
        color: Style.getColor('primary-text1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 8,
        marginVertical: 8,
        borderRadius: 8,
    },

    button: {
        padding: 5,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        borderRadius: 4,
        marginLeft: 8,
    },

    dropdownContainer: {
        marginTop: 16,
    },

    modelInfo: {
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface2'),
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
})
