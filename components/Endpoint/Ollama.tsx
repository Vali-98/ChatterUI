import { MaterialIcons } from '@expo/vector-icons'
import { Global, Logger, Style } from '@globals'
import { useEffect, useState } from 'react'
import { useAutosave } from 'react-autosave'
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { ScrollView } from 'react-native-gesture-handler'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

import HeartbeatButton from './HeartbeatButton'

const Ollama = () => {
    const [ollamaEndpoint, setOllamaEndpoint] = useMMKVString(Global.OllamaEndpoint)
    const [ollamaModel, setOllamaModel] = useMMKVObject<OllamaModel>(Global.OllamaModel)
    const [modelList, setModelList] = useState<OllamaModel[]>([])

    useEffect(() => {
        getModels()
    }, [])

    const getModels = async () => {
        const endpoint = new URL('api/tags', ollamaEndpoint)
        const modelresults = await fetch(endpoint, {
            method: 'GET',
            headers: { accept: 'application/json' },
        }).catch(() => {
            Logger.log(`Could not get models.`, true)
        })
        if (!modelresults) return
        const list = (await modelresults.json()).models
        if (!list) return
        setModelList(list)
    }
    useAutosave({
        data: ollamaEndpoint,
        onSave: getModels,
        interval: 1000,
    })

    return (
        <ScrollView style={styles.mainContainer}>
            <Text style={styles.title}>URL</Text>
            <TextInput
                style={styles.input}
                value={ollamaEndpoint}
                onChangeText={(value) => {
                    setOllamaEndpoint(value)
                }}
                placeholder="eg. http://127.0.0.1:5000"
                placeholderTextColor={Style.getColor('primary-text2')}
            />
            {ollamaEndpoint && (
                <HeartbeatButton
                    api={ollamaEndpoint}
                    apiFormat={(s: string) => {
                        const url = new URL('api/tags', s)
                        return url.toString()
                    }}
                />
            )}
            <View style={styles.dropdownContainer}>
                <Text style={styles.title}>Model</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Dropdown
                        value={ollamaModel}
                        data={modelList}
                        labelField="name"
                        valueField="name"
                        onChange={(item) => {
                            if (item.name === ollamaModel?.name) return
                            setOllamaModel(item)
                        }}
                        placeholder="Select Model"
                        {...Style.drawer.default}
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            getModels()
                        }}>
                        <MaterialIcons
                            name="refresh"
                            color={Style.getColor('primary-text1')}
                            size={24}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {ollamaModel !== undefined && modelList.length > 0 && (
                <View style={styles.modelInfo}>
                    <View style={{ flexDirection: 'row' }}>
                        <View>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Parameters
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Quantization
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Format</Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Family</Text>
                        </View>
                        <View style={{ marginLeft: 16 }}>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {ollamaModel.details.parameter_size}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {ollamaModel.details.quantization_level}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {ollamaModel.details.format}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {ollamaModel.details.family}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </ScrollView>
    )
}

export default Ollama

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },

    title: {
        paddingTop: 8,
        color: Style.getColor('primary-text1'),
        fontSize: 16,
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
    },

    input: {
        color: Style.getColor('primary-text1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
    },

    dropdownContainer: {
        marginTop: 16,
    },

    button: {
        padding: 5,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        borderRadius: 4,
        marginLeft: 8,
    },

    modelInfo: {
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface2'),
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
})

type OllamaModel = {
    name: string
    modified_at: Date
    size: number
    digest: string
    details: {
        format: string
        family: string
        families: null | string[]
        parameter_size: string
        quantization_level: string
    }
}
