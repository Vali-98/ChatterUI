import { Llama, LlamaPreset } from 'app/constants/LlamaLocal'
import { AppSettings, Global, Logger, Style } from '@globals'
import { useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVBoolean, useMMKVObject, useMMKVString } from 'react-native-mmkv'

import { SliderItem } from '..'

const Local = () => {
    const { loadModel, unloadModel, modelName } = Llama.useLlama((state) => ({
        loadModel: state.load,
        unloadModel: state.unload,
        modelName: state.modelname,
    }))

    const [modelLoading, setModelLoading] = useState(false)
    const [modelList, setModelList] = useState<string[]>([])
    const dropdownValues = modelList.map((item) => {
        return { name: item }
    })
    const [currentModel, setCurrentModel] = useMMKVString(Global.LocalModel)
    //const [downloadLink, setDownloadLink] = useState('')
    const [preset, setPreset] = useMMKVObject<LlamaPreset>(Global.LocalPreset)
    const [saveKV, setSaveKV] = useMMKVBoolean(AppSettings.SaveLocalKV)
    const [kvSize, setKVSize] = useState<number>(-1)
    const getModels = async () => {
        setModelList(await Llama.getModelList())
    }

    useEffect(() => {
        getModels()
        Llama.getKVSizeMB().then((size) => {
            setKVSize(size)
        })
    }, [])

    const handleLoad = async () => {
        setModelLoading(true)
        await loadModel(currentModel ?? '', preset)
        setModelLoading(false)
        getModels()
    }
    /*
    const handleLoadExternal = async () => {
        setModelLoading(true)
        await Llama.loadModel('', preset, false).then(() => {
            setLoadedModel(Llama.getModelname())
        })
        setModelLoading(false)
    }*/

    const handleDelete = async () => {
        if (!(await Llama.modelExists(currentModel ?? ''))) {
            Logger.log(`Model Does Not Exist!`, true)
            return
        }

        Alert.alert(`Delete Model`, `Are you sure you want to delete '${currentModel}'?`, [
            { text: `Cancel`, style: `cancel` },
            {
                text: `Confirm`,
                style: `destructive`,
                onPress: () => {
                    Llama.deleteModel(currentModel ?? '')
                        .then(() => {
                            Logger.log('Model Deleted Successfully', true)
                            setCurrentModel(undefined)
                            getModels()
                        })
                        .catch(() => Logger.log('Could Not Delete Model', true))
                },
            },
        ])
    }

    const handleUnload = async () => {
        await unloadModel()
    }

    /*const handleDownload = () => {
        setDownloadLink('')
        Llama.downloadModel(downloadLink).then(() => {
            getModels()
        })
    }*/

    const handleImport = async () => {
        setModelLoading(true)
        await Llama.importModel()
        await getModels()
        setModelLoading(false)
    }

    const disableLoad = modelList.length === 0 || modelName !== undefined
    const disableUnload = modelList.length === 0 || modelName === undefined
    const disableDelete = modelList.length === 0 || currentModel === undefined

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>Model</Text>

            <View
                style={{
                    marginTop: 16,
                    backgroundColor: Style.getColor('primary-surface2'),
                    padding: 4,
                    borderRadius: 4,
                    flexDirection: 'row',
                }}>
                <Text style={styles.subtitle}>Loaded Model : </Text>
                <Text style={{ ...styles.subtitle, color: Style.getColor('primary-text1') }}>
                    {modelName ? modelName : 'None'}
                </Text>
            </View>

            <View style={{ marginTop: 8 }}>
                <Dropdown
                    value={currentModel}
                    data={dropdownValues}
                    placeholder={
                        modelList.length === 0 ? 'No Models. Try Importing Some.' : 'Select Model'
                    }
                    labelField="name"
                    valueField="name"
                    disable={modelList.length === 0}
                    onChange={(item) => setCurrentModel(item.name)}
                    {...Style.drawer.default}
                />
            </View>

            {modelLoading ? (
                <ActivityIndicator size="large" color={Style.getColor('primary-text1')} />
            ) : (
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity
                        disabled={disableLoad}
                        style={{
                            ...(disableLoad ? styles.disabletextbutton : styles.textbutton),
                            marginRight: 8,
                        }}
                        onPress={handleLoad}>
                        <Text
                            style={{
                                ...(disableLoad ? styles.disablebuttonlabel : styles.buttonlabel),
                            }}>
                            Load
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        disabled={disableUnload}
                        style={{
                            ...(disableUnload ? styles.disabletextbutton : styles.textbutton),
                            marginRight: 8,
                        }}
                        onPress={handleUnload}>
                        <Text
                            style={{
                                ...(disableUnload ? styles.disablebuttonlabel : styles.buttonlabel),
                            }}>
                            Unload
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        disabled={disableDelete}
                        style={{
                            ...(disableDelete ? styles.disabletextbutton : styles.textbutton),
                            marginRight: 8,
                        }}
                        onPress={handleDelete}>
                        <Text
                            style={{
                                ...(disableDelete ? styles.disablebuttonlabel : styles.buttonlabel),
                            }}>
                            Delete
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ ...styles.textbutton, marginRight: 8 }}
                        onPress={handleImport}>
                        <Text style={styles.buttonlabel}>Import Model</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/*
		// Loading without importing is crash prone, not recommended	
		<TouchableOpacity style={{...styles.textbutton, marginRight: 8, marginTop: 8}} onPress={handleLoadExternal}> 
			<Text style={styles.buttonlabel}>Load External Model [Warning: will freeze]</Text>
		</TouchableOpacity> */}

            {/*
		// Requires proper download manager, suggested to use IMPORT instead
		<View style={{marginTop: 16}}>
			<Text style={styles.title}>Download Model</Text>
			<Text style={styles.subtitle}>Provide a Huggingface download link for a GGUF format model</Text>
			<View style={{flexDirection: 'row', alignItems: 'center'}}>
				<TextInput 
					style={styles.input} 
					value={downloadLink}
					onChangeText={setDownloadLink}
				/>
				<TouchableOpacity style={styles.button} onPress={handleDownload}> 
					<FontAwesome name='download' color={Color.White} size={24} />
				</TouchableOpacity>

			</View>
		</View>
		*/}

            <View style={{ marginTop: 16 }}>
                <SliderItem
                    name="Max Context"
                    body={preset}
                    setValue={setPreset}
                    varname="context_length"
                    min={512}
                    max={32768}
                    step={32}
                />
                <SliderItem
                    name="Threads"
                    body={preset}
                    setValue={setPreset}
                    varname="threads"
                    min={1}
                    max={8}
                    step={1}
                />

                <SliderItem
                    name="Batch"
                    body={preset}
                    setValue={setPreset}
                    varname="batch"
                    min={16}
                    max={512}
                    step={1}
                />
                {/* Note: llama.rn does not have any Android gpu acceleration */}
                {Platform.OS === 'ios' && (
                    <SliderItem
                        name="GPU Layers"
                        body={preset}
                        setValue={setPreset}
                        varname="gpu_layers"
                        min={0}
                        max={100}
                        step={1}
                    />
                )}
            </View>
            {saveKV && (
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.title}>Cache Management</Text>
                    <Text style={{ ...styles.subtitle, marginTop: 4 }}>Cache Size: {kvSize}MB</Text>
                    <TouchableOpacity
                        style={{ ...styles.textbutton, marginTop: 8 }}
                        onPress={() =>
                            WarningAlert(
                                'Delete Cache',
                                'Are you sure you want to delete the cache? This cannot be undone.',
                                async () => {
                                    await Llama.deleteKV()
                                    setKVSize(await Llama.getKVSizeMB())
                                }
                            )
                        }>
                        <Text style={styles.buttonlabel}>Delete Cache</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

export default Local

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },

    title: {
        color: Style.getColor('primary-text1'),
        fontSize: 16,
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
    },

    buttonlabel: {
        color: Style.getColor('primary-text1'),
        fontSize: 16,
    },

    disablebuttonlabel: {
        color: Style.getColor('primary-text2'),
        fontSize: 16,
    },

    input: {
        flex: 1,
        color: Style.getColor('primary-text1'),
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
        marginRight: 8,
    },

    textbutton: {
        padding: 8,
        borderRadius: 4,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
    },

    disabletextbutton: {
        padding: 8,
        borderRadius: 4,
        borderColor: Style.getColor('primary-surface3'),
        borderWidth: 1,
    },

    dropdownContainer: {
        marginTop: 16,
    },

    dropdownbox: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginVertical: 8,
        borderRadius: 8,
    },

    selected: {
        color: Style.getColor('primary-text1'),
    },
})

const WarningAlert = (title: string, description: string, onPress: () => void) => {
    Alert.alert(title, description, [
        { text: `Cancel`, style: `cancel` },
        {
            text: `Confirm`,
            style: `destructive`,
            onPress: onPress,
        },
    ])
}
