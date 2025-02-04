import ThemedSwitch from '@components/input/ThemedSwitch'
import Alert from '@components/views/Alert'
import { AntDesign } from '@expo/vector-icons'
import { APIManagerValue, APIState } from '@lib/engine/API/APIManagerState'
import { Style } from '@lib/utils/Global'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import EditAPIModal from './EditAPIModal'

type APIValueItemProps = {
    item: APIManagerValue
    index: number
}

const APIValueItem: React.FC<APIValueItemProps> = ({ item, index }) => {
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedSwitch
                    value={item.active}
                    onChangeValue={(value) => {
                        editValue({ ...item, active: value }, index)
                    }}
                />

                <View style={{ marginLeft: 18 }}>
                    <Text style={item.active ? styles.name : styles.nameInactive}>
                        {item.friendlyName}
                    </Text>
                    <Text style={item.active ? styles.config : styles.configInactive}>
                        Config: {item.configName}
                    </Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 16 }}>
                <TouchableOpacity onPress={handleDelete}>
                    <AntDesign
                        name="delete"
                        color={Style.getColor('destructive-brand')}
                        size={24}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowEditor(true)}>
                    <AntDesign name="edit" color={Style.getColor('primary-text1')} size={24} />
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default APIValueItem

const styles = StyleSheet.create({
    longContainer: {
        backgroundColor: Style.getColor('primary-surface2'),
        borderColor: Style.getColor('primary-surface2'),
        borderWidth: 2,
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 16,
        flex: 1,
        paddingLeft: 12,
        paddingRight: 24,
        paddingVertical: 16,
    },

    longContainerInactive: {
        borderColor: Style.getColor('primary-surface1'),
        borderWidth: 2,
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 16,
        flex: 1,
        paddingHorizontal: 12,
        paddingRight: 24,
        paddingVertical: 16,
    },

    name: {
        fontSize: 17,
        color: Style.getColor('primary-text1'),
    },

    nameInactive: {
        fontSize: 17,
        color: Style.getColor('primary-text2'),
    },

    config: {
        color: Style.getColor('primary-text2'),
    },

    configInactive: {
        color: Style.getColor('primary-text3'),
    },
})
