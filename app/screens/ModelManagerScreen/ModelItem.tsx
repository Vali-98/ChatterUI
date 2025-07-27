import DropdownSheet from '@components/input/DropdownSheet'
import Alert from '@components/views/Alert'
import TextBoxModal from '@components/views/TextBoxModal'
import { AntDesign } from '@expo/vector-icons'
import { GGMLNameMap } from '@lib/engine/Local'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Model, ModelListQueryType } from '@lib/engine/Local/Model'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { readableFileSize } from '@lib/utils/File'
import { ModelDataType } from 'db/schema'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

type ModelItemProps = {
    item: ModelListQueryType
    modelLoading: boolean
    setModelLoading: (b: boolean) => void
    mmprojList: ModelDataType[]
    modelImporting: boolean
}

const ModelItem: React.FC<ModelItemProps> = ({
    item,
    modelImporting,
    modelLoading,
    setModelLoading,
    mmprojList,
}) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const [showMMPROJSelector, setShowMMPROJSelector] = useState(false)
    const { loadModel, unloadModel, loadMmproj, modelId, mmprojId } = Llama.useLlamaModelStore(
        useShallow((state) => ({
            loadMmproj: state.loadMmproj,
            loadModel: state.load,
            unloadModel: state.unload,
            modelId: state.model?.id,
            mmprojId: state.mmproj?.id,
        }))
    )

    const maybeClearLastLoaded = Llama.useLlamaPreferencesStore(
        useShallow((state) => state.maybeClearLastLoaded)
    )

    const [showEdit, setShowEdit] = useState(false)
    //@ts-ignore
    const quant: string = item.quantization && GGMLNameMap[item.quantization]
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
                        maybeClearLastLoaded(item)
                    },
                    type: 'warning',
                },
            ],
        })
    }
    const isMMPROJ = Model.isMMPROJ(item.architecture)
    const isLoaded = isMMPROJ ? mmprojId === item.id : modelId === item.id

    const disable =
        modelLoading || isInvalid || modelImporting || isMMPROJ
            ? !modelId || isLoaded
            : modelId !== undefined
    const disableEdit = isLoaded || modelLoading || isInvalid
    const disableDelete = isLoaded || modelLoading

    const loadToggle = isLoaded ? modelLoading || modelImporting : disable

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
            {!isInvalid && !isMMPROJ && (
                <Text style={styles.subtitle}>Context Length: {item.context_length}</Text>
            )}
            <Text style={styles.subtitle}>File: {item.file.replace('.gguf', '')}</Text>
            <View style={styles.buttonContainer}>
                {!isMMPROJ && mmprojList.length > 0 && (
                    <TouchableOpacity
                        style={styles.button}
                        onPress={async () => {
                            if (item.mmprojLink) {
                                await Model.removeMMPROJLink(item)
                                const mmproj = mmprojList.filter(
                                    (a) => a.id === item.mmprojLink?.mmproj_id
                                )?.[0]
                                if (mmproj) {
                                    maybeClearLastLoaded(mmproj)
                                }
                                return
                            }

                            setShowMMPROJSelector(!showMMPROJSelector)
                        }}>
                        <AntDesign
                            name={showMMPROJSelector && !item.mmprojLink ? 'close' : 'camerao'}
                            size={24}
                            color={disableEdit ? color.text._600 : color.text._300}
                        />
                        {item.mmprojLink && (
                            <AntDesign
                                name="close"
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    transform: [{ translateX: 10 }],
                                }}
                                size={18}
                                color={disableEdit ? color.text._600 : color.text._300}
                            />
                        )}
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    disabled={disableEdit}
                    style={styles.button}
                    onPress={() => {
                        setShowEdit(true)
                    }}>
                    <AntDesign
                        name="edit"
                        size={24}
                        color={disableEdit ? color.text._600 : color.text._300}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={disableDelete}
                    style={styles.button}
                    onPress={() => {
                        handleDeleteModel()
                    }}>
                    <AntDesign
                        name="delete"
                        size={24}
                        color={disableDelete ? color.text._600 : color.error._500}
                    />
                </TouchableOpacity>

                {!isMMPROJ && (
                    <TouchableOpacity
                        disabled={loadToggle}
                        style={styles.button}
                        onPress={async () => {
                            if (isLoaded) {
                                await unloadModel()
                                return
                            }

                            setModelLoading(true)
                            await loadModel(item).catch((e) => {
                                Logger.error(`Failed to load model: ${e}`)
                            })
                            if (item.mmprojLink) {
                                const mmprojModel = mmprojList.filter(
                                    (a) => a.id === item.mmprojLink?.mmproj_id
                                )?.[0]
                                if (mmprojModel) {
                                    await loadMmproj(mmprojModel)
                                }
                            }
                            setModelLoading(false)
                        }}>
                        <AntDesign
                            name={isLoaded ? 'closecircleo' : 'playcircleo'}
                            size={24}
                            color={loadToggle ? color.text._600 : color.text._300}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {((showMMPROJSelector && mmprojList.length > 0) || (item.mmprojLink && !isMMPROJ)) && (
                <DropdownSheet
                    modalTitle="Select MMPROJ Model"
                    containerStyle={{ marginTop: 12, marginBottom: 4 }}
                    data={mmprojList}
                    selected={
                        mmprojList.filter((e) => e.id === item.mmprojLink?.mmproj_id)?.[0] ??
                        undefined
                    }
                    labelExtractor={(item) => item.name}
                    onChangeValue={async (value) => {
                        try {
                            if (item.mmprojLink) await Model.removeMMPROJLink(item)
                            await Model.createMMPROJLink(item, value)
                        } catch (e) {
                            Logger.errorToast('Failed to link model: ' + e)
                        }
                    }}
                />
            )}
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
            marginTop: spacing.l,
            borderColor: color.neutral._300,
        },

        button: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: spacing.s,
        },
    })
}
