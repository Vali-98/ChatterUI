import Alert from '@components/Alert'
import TextBoxModal from '@components/TextBoxModal'
import { GGMLNameMap, Llama, readableFileSize } from '@constants/LlamaLocal'
import { AntDesign } from '@expo/vector-icons'
import { Global, Style } from '@globals'
import { ModelDataType } from 'db/schema'
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'
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
    const [autoLoad, setAutoLoad] = useMMKVObject<ModelDataType>(Global.LocalModel)
    //@ts-ignore
    const quant: string = item.quantization && GGMLNameMap[item.quantization]
    const disableDelete = modelId === item.id || modelLoading
    const isInvalid = Llama.isInitialEntry(item)

    const handleDeleteModel = () => {
        Alert.alert({
            title: 'Delete Model',
            description:
                `Are you sure you want to delete "${item.name}"?\n\nThis cannot be undone!` +
                (!isInvalid
                    ? !item.file_path.startsWith('content')
                        ? `\n\nThis operation will clear up ${readableFileSize(item.file_size)}`
                        : '\n\n(This will not delete external model files, just this entry)'
                    : ''),
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Model',
                    onPress: async () => {
                        await Llama.deleteModelById(item.id)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const disable = modelLoading || modelImporting || modelId !== undefined || isInvalid
    const disableEdit = modelId === item.id || modelLoading || isInvalid

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
            {!isInvalid && (
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
            )}
            {isInvalid && (
                <View style={styles.tagContainer}>
                    <Text style={styles.tag}>Model is Invalid</Text>
                </View>
            )}
            {!isInvalid && (
                <Text style={styles.subtitle}>Context Length: {item.context_length}</Text>
            )}
            <Text style={styles.subtitle}>File: {item.file.replace('.gguf', '')}</Text>
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
                            setAutoLoad(item)
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
})
