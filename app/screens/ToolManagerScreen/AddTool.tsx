import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import { Logger } from '@lib/state/Logger'
import { ToolState } from '@lib/state/ToolState'
import { Theme } from '@lib/theme/ThemeManager'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const PARAMS_PLACEHOLDER = `{"type":"object","properties":{"query":{"type":"string","description":"The search query"}},"required":["query"]}`

const AddTool = () => {
    const styles = useStyles()
    const router = useRouter()
    const addTool = ToolState.useToolStore((state) => state.addTool)

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [parametersJson, setParametersJson] = useState('')
    const [error, setError] = useState('')

    const handleCreate = () => {
        setError('')

        if (!name.trim()) {
            setError('Name is required')
            return
        }

        if (!/^[a-z0-9_]+$/.test(name.trim())) {
            setError('Name must be lowercase alphanumeric with underscores only')
            return
        }

        if (!description.trim()) {
            setError('Description is required')
            return
        }

        let parsedParams: object
        try {
            parsedParams = JSON.parse(parametersJson.trim() || '{"type":"object","properties":{}}')
        } catch (e) {
            setError('Parameters must be valid JSON')
            return
        }

        addTool({
            name: name.trim(),
            description: description.trim(),
            parameters_schema: parsedParams,
            enabled: true,
            builtin: false,
            character_id: null,
        })

        Logger.info(`Custom tool created: ${name.trim()}`)
        router.back()
    }

    return (
        <SafeAreaView edges={['bottom']} style={styles.mainContainer}>
            <Stack.Screen options={{ title: 'Add Custom Tool' }} />
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ rowGap: 16, paddingBottom: 24 }}>
                <ThemedTextInput
                    label="Function Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. web_search"
                />
                <Text style={styles.hintText}>
                    Lowercase letters, numbers, and underscores only
                </Text>

                <ThemedTextInput
                    label="Description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe what this tool does for the model"
                />

                <View>
                    <ThemedTextInput
                        label="Parameters (JSON Schema)"
                        value={parametersJson}
                        onChangeText={setParametersJson}
                        multiline
                        numberOfLines={6}
                        placeholder={PARAMS_PLACEHOLDER}
                    />
                    <Text style={styles.hintText}>
                        JSON Schema defining the function's parameters. Leave empty for no
                        parameters.
                    </Text>
                </View>

                {error !== '' && <Text style={styles.errorText}>{error}</Text>}
            </ScrollView>
            <ThemedButton label="Create Tool" onPress={handleCreate} />
        </SafeAreaView>
    )
}

export default AddTool

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()
    return StyleSheet.create({
        mainContainer: {
            marginVertical: spacing.xl,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl,
            flex: 1,
        },

        hintText: {
            marginTop: spacing.s,
            color: color.text._400,
        },

        errorText: {
            color: color.error._400,
            marginTop: spacing.s,
        },
    })
}
