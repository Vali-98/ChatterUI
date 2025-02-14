import Alert from '@components/views/Alert'
import TextBoxModal from '@components/views/TextBoxModal'
import { AntDesign } from '@expo/vector-icons'
import { GGMLNameMap } from '@lib/engine/Local'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Model } from '@lib/engine/Local/Model'
import { Theme } from '@lib/theme/ThemeManager'
import { readableFileSize } from '@lib/utils/File'
import { ModelDataType } from 'db/schema'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

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
    const styles = useStyles()
    const { color } = Theme.useTheme()

    const { loadModel, unloadModel, modelId } = Llama.useLlama((state) => ({
        loadModel: state.load,
        unloadModel: state.unload,
        modelId: state.model?.id,
    }))

    const [showEdit, setShowEdit] = useState(false)
    //@ts-ignore
    const quant: string = item.quantization && GGMLNameMap[item.quantization]
    const disableDelete = modelId === item.id || modelLoading
    const isInvalid = Model.isInitialEntry(item)

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
                        if (modelId === item.id) {
                            await unloadModel()
                        }
                        await Model.deleteModelById(item.id)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const disable = modelLoading || modelImporting || modelId !== undefined || isInvalid
    const disableEdit = modelId === item.id || modelLoading || isInvalid

    return (
        <View style={styles.modelContainer}>
            <TextBoxModal
                booleans={[showEdit, setShowEdit]}
                onConfirm={async (name) => {
                    await Model.updateName(name, item.id)
                }}
                title="Rename Model"
                defaultValue={item.name}
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
                        color={disableEdit ? color.text._600 : color.text._300}
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
                        color={disableDelete ? color.text._600 : color.error._500}
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
                            color={disable ? color.text._600 : color.text._300}
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
                            color={color.text._100}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}

export default ModelItem

const useStyles = () => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        modelContainer: {
            borderRadius: spacing.l,
            paddingVertical: spacing.l,
            paddingHorizontal: spacing.xl2,
            backgroundColor: color.neutral._200,
            marginBottom: spacing.l,
        },

        tagContainer: {
            columnGap: 4,
            rowGap: 4,
            paddingTop: spacing.m,
            paddingBottom: spacing.m,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
        },

        tag: {
            borderRadius: borderRadius.m,
            borderColor: color.primary._300,
            borderWidth: 1,
            paddingHorizontal: spacing.m,
            paddingVertical: spacing.s,
            color: color.text._300,
        },
        title: {
            fontSize: fontSize.l,
            color: color.text._100,
        },

        subtitle: {
            color: color.text._400,
        },

        buttonContainer: {
            flexDirection: 'row',
            flex: 1,
            justifyContent: 'space-between',
            marginTop: spacing.l,
            borderColor: color.neutral._300,
        },

        button: {
            flex: 1,
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.xl3,
        },
    })
}
