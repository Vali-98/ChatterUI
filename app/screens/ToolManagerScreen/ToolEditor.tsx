import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import FadeBackrop from '@components/views/FadeBackdrop'
import { ToolDefinitionType } from 'db/schema'
import { Logger } from '@lib/state/Logger'
import { ToolState } from '@lib/state/ToolState'
import { Theme } from '@lib/theme/ThemeManager'
import { useEffect, useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, SlideOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type ToolEditorProps = {
    tool: ToolDefinitionType
    show: boolean
    close: () => void
}

const ToolEditor: React.FC<ToolEditorProps> = ({ tool, show, close }) => {
    const { color, spacing, fontSize } = Theme.useTheme()
    const styles = useStyles()
    const updateTool = ToolState.useToolStore((state) => state.updateTool)

    const [name, setName] = useState(tool.name)
    const [description, setDescription] = useState(tool.description)
    const [parametersJson, setParametersJson] = useState(
        JSON.stringify(tool.parameters_schema, null, 2)
    )
    const [error, setError] = useState('')

    useEffect(() => {
        setName(tool.name)
        setDescription(tool.description)
        setParametersJson(JSON.stringify(tool.parameters_schema, null, 2))
        setError('')
    }, [tool, show])

    const handleSave = () => {
        setError('')

        if (!name.trim()) {
            setError('Name is required')
            return
        }

        if (!tool.builtin && !/^[a-z0-9_]+$/.test(name.trim())) {
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

        const updates: Partial<ToolDefinitionType> = {
            description: description.trim(),
        }

        if (!tool.builtin) {
            updates.name = name.trim()
            updates.parameters_schema = parsedParams
        }

        updateTool(tool.id, updates)
        Logger.info(`Tool updated: ${tool.name}`)
        close()
    }

    return (
        <Modal
            transparent
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={close}
            visible={show}
            animationType="fade">
            <FadeBackrop handleOverlayClick={close} />

            <View style={{ flex: 1 }} />
            <Animated.View
                style={styles.mainContainer}
                entering={FadeIn.duration(100)}
                exiting={SlideOutDown.duration(300)}>
                <Text
                    style={{
                        color: color.text._100,
                        fontSize: fontSize.xl2,
                        fontWeight: '500',
                        paddingBottom: spacing.xl2,
                    }}>
                    Edit Tool
                </Text>

                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ rowGap: 16, paddingBottom: spacing.xl2 }}>
                    <ThemedTextInput
                        label="Function Name"
                        value={name}
                        onChangeText={setName}
                        editable={!tool.builtin}
                    />
                    {tool.builtin && (
                        <Text style={styles.hintText}>Built-in tool names cannot be changed</Text>
                    )}

                    <ThemedTextInput
                        label="Description"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                    />

                    <View>
                        <ThemedTextInput
                            label="Parameters (JSON Schema)"
                            value={parametersJson}
                            onChangeText={setParametersJson}
                            multiline
                            numberOfLines={6}
                            editable={!tool.builtin}
                        />
                        {tool.builtin && (
                            <Text style={styles.hintText}>
                                Built-in tool parameters cannot be changed
                            </Text>
                        )}
                    </View>

                    {error !== '' && <Text style={styles.errorText}>{error}</Text>}
                </ScrollView>
                <ThemedButton
                    buttonStyle={{ marginTop: 8 }}
                    label="Save Changes"
                    onPress={handleSave}
                />
            </Animated.View>
        </Modal>
    )
}

export default ToolEditor

const useStyles = () => {
    const insets = useSafeAreaInsets()
    const { color, spacing, borderRadius } = Theme.useTheme()
    return StyleSheet.create({
        mainContainer: {
            marginVertical: spacing.xl,
            paddingTop: spacing.xl2,
            paddingBottom: insets.bottom,
            paddingHorizontal: spacing.xl,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            minHeight: '70%',
            backgroundColor: color.neutral._100,
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
