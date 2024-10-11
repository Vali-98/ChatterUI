import TextBoxModal from '@components/TextBoxModal'
import { GGMLNameMap, Llama, readableFileSize } from '@constants/LlamaLocal'
import { AntDesign } from '@expo/vector-icons'
import { Style } from '@globals'
import { ModelDataType } from 'db/schema'
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import Animated, { Easing, SlideInLeft } from 'react-native-reanimated'

type ModelItemProps = {
    item: ModelDataType
    index: number
    modelLoading: boolean
    setModelLoading: (b: boolean) => void
    modelImporting: boolean
}

const ModelItem: React.FC<ModelItemProps> = ({
    item,
    modelImporting,
    modelLoading,
    setModelLoading,
    index,
}) => {
    const { loadModel, unloadModel, modelId } = Llama.useLlama((state) => ({
        loadModel: state.load,
        unloadModel: state.unload,
        modelId: state.model?.id,
    }))

    const [showEdit, setShowEdit] = useState(false)

    //@ts-ignore
    const quant: string = item.quantization && GGMLNameMap[item.quantization]
    const disable = modelLoading || modelImporting || modelId !== undefined
    const disableDelete = modelId === item.id || modelLoading
    const disableEdit = modelId === item.id || modelLoading

    const handleDeleteModel = () => {
        Alert.alert(
            'Delete Model',
            `Are you sure you want to delete "${item.name}"? This cannot be undone!` +
                (!item.file_path.startsWith('content')
                    ? `\n\nThis operation will clear up ${readableFileSize(item.file_size)}`
                    : ''),
            [
                { text: `Cancel`, style: `cancel` },
                {
                    text: `Confirm`,
                    style: `destructive`,
                    onPress: async () => {
                        await Llama.deleteModelById(item.id)
                    },
                },
            ]
        )
    }

    return (
        <Animated.View
            style={styles.modelContainer}
            entering={SlideInLeft.easing(Easing.inOut(Easing.cubic))}>
            <TextBoxModal
                booleans={[showEdit, setShowEdit]}
                onConfirm={async (name) => {
                    await Llama.updateName(name, item.id)
                }}
                title="Rename Model"
            />

            <Text style={styles.title}>{item.name}</Text>
            <View style={styles.tagContainer}>
                <Text style={styles.tag}>
                    {item.params === 'N/A' ? 'No Param Size' : item.params}
                </Text>
                <Text style={styles.tag}>{quant}</Text>
                <Text style={styles.tag}>{readableFileSize(item.file_size)}</Text>
                <Text style={{ ...styles.tag, textTransform: 'capitalize' }}>
                    {item.architecture}
                </Text>
                <Text style={styles.tag}>
                    {item.file_path.startsWith('content') ? 'External' : 'Internal'}
                </Text>
            </View>
            <Text style={styles.subtitle}>Context Length: {item.context_length}</Text>
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    disabled={disableEdit}
                    onPress={() => {
                        setShowEdit(true)
                    }}>
                    <AntDesign
                        name="edit"
                        style={styles.button}
                        size={24}
                        color={Style.getColor(disableEdit ? 'primary-text3' : 'primary-text1')}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={disableDelete}
                    onPress={() => {
                        handleDeleteModel()
                    }}>
                    <AntDesign
                        name="delete"
                        style={styles.button}
                        size={24}
                        color={Style.getColor(
                            disableDelete ? 'primary-text3' : 'destructive-brand'
                        )}
                    />
                </TouchableOpacity>
                {modelId !== item.id && (
                    <TouchableOpacity
                        disabled={disable}
                        onPress={async () => {
                            setModelLoading(true)
                            await loadModel(item)
                            setModelLoading(false)
                        }}>
                        <AntDesign
                            name="playcircleo"
                            style={styles.button}
                            size={24}
                            color={Style.getColor(disable ? 'primary-text3' : 'primary-text1')}
                        />
                    </TouchableOpacity>
                )}
                {modelId === item.id && (
                    <TouchableOpacity
                        disabled={modelLoading || modelImporting}
                        onPress={async () => {
                            await unloadModel()
                        }}>
                        <AntDesign
                            name="closecircleo"
                            style={styles.button}
                            size={24}
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    )
}

export default ModelItem

const styles = StyleSheet.create({
    mainContainer: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
        flex: 1,
    },

    list: {
        flex: 1,
    },

    modelContainer: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: Style.getColor('primary-surface2'),
        marginBottom: 12,
    },

    tagContainer: {
        paddingTop: 12,
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
    },

    tag: {
        borderRadius: 4,
        borderColor: Style.getColor('primary-surface4'),
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 4,
        color: Style.getColor('primary-text2'),
    },
    title: {
        fontSize: 16,
        color: Style.getColor('primary-text1'),
    },

    modelTitle: {
        color: Style.getColor('primary-text1'),
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
    },

    buttonContainer: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'space-between',
        marginTop: 12,
        borderColor: Style.getColor('primary-surface3'),
    },

    button: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 32,
    },

    settingsButton: {
        backgroundColor: Style.getColor('primary-brand'),
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
    },
})
