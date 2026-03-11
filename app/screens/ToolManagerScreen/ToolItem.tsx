import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import Alert from '@components/views/Alert'
import { ToolDefinitionType } from 'db/schema'
import { ToolState } from '@lib/state/ToolState'
import { Theme } from '@lib/theme/ThemeManager'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ToolEditor from './ToolEditor'

type ToolItemProps = {
    tool: ToolDefinitionType
    index: number
}

const ToolItem: React.FC<ToolItemProps> = ({ tool, index }) => {
    const { spacing, fontSize } = Theme.useTheme()
    const styles = useStyles()
    const [showEditor, setShowEditor] = useState(false)

    const { toggleTool, removeTool } = ToolState.useToolStore(
        useShallow((state) => ({
            toggleTool: state.toggleTool,
            removeTool: state.removeTool,
        }))
    )

    const handleDelete = () => {
        Alert.alert({
            title: 'Delete Tool',
            description: `Are you sure you want to delete "${tool.name}"?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Tool',
                    onPress: () => {
                        removeTool(tool.id)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const sourceLabel = tool.builtin ? 'Built-in' : 'Custom'

    return (
        <View style={tool.enabled ? styles.container : styles.containerInactive}>
            <ToolEditor tool={tool} show={showEditor} close={() => setShowEditor(false)} />

            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <ThemedSwitch
                    value={tool.enabled ?? false}
                    onChangeValue={() => toggleTool(tool.id)}
                />
                <View style={{ marginLeft: spacing.xl, flex: 1 }}>
                    <Text
                        numberOfLines={1}
                        style={tool.enabled ? styles.name : styles.nameInactive}>
                        {tool.name}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={tool.enabled ? styles.description : styles.descriptionInactive}>
                        {tool.description || 'No description'}
                    </Text>
                    <Text style={styles.badge}>{sourceLabel}</Text>
                </View>
            </View>

            {!tool.builtin && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedButton
                        onPress={handleDelete}
                        variant="critical"
                        iconName="delete"
                        iconSize={24}
                        buttonStyle={{ borderWidth: 0 }}
                    />
                    <ThemedButton
                        onPress={() => setShowEditor(true)}
                        variant="tertiary"
                        iconName="edit"
                        iconSize={24}
                        buttonStyle={{ borderWidth: 0 }}
                    />
                </View>
            )}
        </View>
    )
}

export default ToolItem

const useStyles = () => {
    const { color, spacing, borderWidth, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        container: {
            borderColor: color.primary._500,
            borderWidth: borderWidth.m,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: spacing.xl,
            flex: 1,
            paddingLeft: spacing.xl,
            paddingRight: spacing.xl,
            paddingVertical: spacing.xl,
        },

        containerInactive: {
            borderColor: color.neutral._200,
            borderWidth: borderWidth.m,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: spacing.xl,
            flex: 1,
            paddingLeft: spacing.xl,
            paddingRight: spacing.xl,
            paddingVertical: spacing.xl,
        },

        name: {
            fontSize: fontSize.l,
            color: color.text._100,
        },

        nameInactive: {
            fontSize: fontSize.l,
            color: color.text._400,
        },

        description: {
            color: color.text._400,
            fontSize: fontSize.s,
        },

        descriptionInactive: {
            color: color.text._700,
            fontSize: fontSize.s,
        },

        badge: {
            color: color.text._500,
            fontSize: fontSize.s,
            marginTop: spacing.xs,
            fontStyle: 'italic',
        },
    })
}
