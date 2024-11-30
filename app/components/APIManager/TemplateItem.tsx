import Alert from '@components/Alert'
import { APIConfiguration } from '@constants/API/APIBuilder.types'
import { AntDesign } from '@expo/vector-icons'
import { APIState } from 'constants/API/APIManagerState'
import { Logger, saveStringToDownload, Style } from 'constants/Global'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type TemplateItemProps = {
    item: APIConfiguration
    index: number
}

const TemplateItem: React.FC<TemplateItemProps> = ({ item, index }) => {
    const { removeTemplate, editValue } = APIState.useAPIState((state) => ({
        removeTemplate: state.removeTemplate,
        editValue: state.editValue,
    }))

    const handleDelete = () => {
        Alert.alert({
            title: 'Delete Template',
            description: `Are you sure you want to delete "${item.name}"?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Template',
                    onPress: () => {
                        removeTemplate(index)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <View style={styles.longContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ marginLeft: 18 }}>
                    <Text style={styles.name}>{item.name}</Text>
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
                <TouchableOpacity onPress={() => {}}>
                    <AntDesign name="edit" color={Style.getColor('primary-text2')} size={24} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        saveStringToDownload(
                            JSON.stringify(item),
                            `${item.name}.json`,
                            'utf8'
                        ).then(() => {
                            Logger.log(`Saved ${item.name}.json To Downloads`, true)
                        })
                    }}>
                    <AntDesign name="download" color={Style.getColor('primary-text2')} size={24} />
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default TemplateItem

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

    name: {
        fontSize: 17,
        color: Style.getColor('primary-text1'),
    },

    config: {
        color: Style.getColor('primary-text2'),
    },

    configInactive: {
        color: Style.getColor('primary-text3'),
    },
})
