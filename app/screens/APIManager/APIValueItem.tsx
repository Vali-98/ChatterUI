import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import Alert from '@components/views/Alert'
import { APIManagerValue, APIState } from '@lib/engine/API/APIManagerState'
import { Theme } from '@lib/theme/ThemeManager'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import EditAPIModal from './EditAPIModal'

type APIValueItemProps = {
    item: APIManagerValue
    index: number
}

const APIValueItem: React.FC<APIValueItemProps> = ({ item, index }) => {
    const { spacing } = Theme.useTheme()
    const styles = useStyles()
    const [showEditor, setShowEditor] = useState(false)
    const { removeValue, editValue } = APIState.useAPIState((state) => ({
        removeValue: state.removeValue,
        editValue: state.editValue,
    }))

    const handleDelete = () => {
        Alert.alert({
            title: 'Delete API Entry',
            description: `Are you sure you want to delete "${item.friendlyName}"?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete API',
                    onPress: () => {
                        removeValue(index)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <View style={item.active ? styles.longContainer : styles.longContainerInactive}>
            <EditAPIModal
                index={index}
                originalValues={item}
                show={showEditor}
                close={() => {
                    setShowEditor(false)
                }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <ThemedSwitch
                    value={item.active}
                    onChangeValue={(value) => {
                        editValue({ ...item, active: value }, index)
                    }}
                />

                <View style={{ marginLeft: spacing.xl, flex: 1 }}>
                    <Text numberOfLines={1} style={item.active ? styles.name : styles.nameInactive}>
                        {item.friendlyName}
                    </Text>
                    <Text style={item.active ? styles.config : styles.configInactive}>
                        Config: {item.configName}
                    </Text>
                </View>
            </View>
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
        </View>
    )
}

export default APIValueItem

const useStyles = () => {
    const { color, spacing, borderWidth, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        longContainer: {
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

        longContainerInactive: {
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

        config: {
            color: color.text._400,
        },

        configInactive: {
            color: color.text._700,
        },
    })
}
