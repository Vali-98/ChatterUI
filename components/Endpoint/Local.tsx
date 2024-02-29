import { Llama } from '@constants/llama'
import { Global, Logger, Style } from '@globals'
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
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'
import { SliderItem } from '..'

const Local = () => {
    const [modelLoading, setModelLoading] = useState(false)
    const [modelList, setModelList] = useState<Array<string>>([])
    const dropdownValues = modelList.map((item) => {
        return { name: item }
    })
    const [currentModel, setCurrentModel] = useMMKVString(Global.LocalModel)
    const [downloadLink, setDownloadLink] = useState('')
    const [preset, setPreset] = useMMKVObject<Llama.LlamaPreset>(Global.LocalPreset)
    const [loadedModel, setLoadedModel] = useState(Llama.getModelname())

    const getModels = async () => {
        setModelList(await Llama.getModels())
    }

    useEffect(() => {
        getModels()
    }, [])

    const handleLoad = async () => {
        setModelLoading(true)
        await Llama.loadModel(currentModel ?? '', preset).then(() => {
            setLoadedModel(Llama.getModelname())
        })
        setModelLoading(false)
        getModels()
    }

    const handleLoadExternal = async () => {
        setModelLoading(true)
        await Llama.loadModel('', preset, false).then(() => {
            setLoadedModel(Llama.getModelname())
        })
        setModelLoading(false)
    }

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
                            setLoadedModel(Llama.getModelname())
                            getModels()
                        })
                        .catch(() => Logger.log('Could Not Delete Model', true))
                },
            },
        ])
    }

    const handleUnload = async () => {
        await Llama.unloadModel()
        setLoadedModel(Llama.getModelname())
    }

    const handleDownload = () => {
        setDownloadLink('')
        Llama.downloadModel(downloadLink).then(() => {
            getModels()
        })
    }

    const handleImport = async () => {
        setModelLoading(true)
        await Llama.importModel().then(() => {
            getModels()
        })
        setModelLoading(false)
    }

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
                <Text style={styles.subtitle}>Current Model : </Text>
                <Text style={{ ...styles.subtitle, color: Style.getColor('primary-text1') }}>
                    {loadedModel === undefined ? 'None' : loadedModel}
                </Text>
            </View>

            <View style={{ marginTop: 8 }}>
                <Dropdown
                    value={currentModel}
                    data={dropdownValues}
                    labelField="name"
                    valueField="name"
                    onChange={(item) => setCurrentModel(item.name)}
                    {...Style.drawer.default}
                />
            </View>

            {modelLoading ? (
                <ActivityIndicator size="large" color={Style.getColor('primary-text1')} />
            ) : (
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity
                        style={{ ...styles.textbutton, marginRight: 8 }}
                        onPress={handleLoad}>
                        <Text style={{ ...styles.buttonlabel }}>Load</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ ...styles.textbutton, marginRight: 8 }}
                        onPress={handleUnload}>
                        <Text style={{ ...styles.buttonlabel }}>Unload</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{ ...styles.textbutton, marginRight: 8 }}
                        onPress={handleDelete}>
                        <Text style={{ ...styles.buttonlabel }}>Delete</Text>
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
                    min={32}
                    max={8096}
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
                {Platform.OS == 'ios' && (
                    <SliderItem
                        name="GPU Layers"
                        body={preset}
                        setValue={setPreset}
                        varname={'gpu_layers'}
                        min={0}
                        max={100}
                        step={1}
                    />
                )}
            </View>
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
