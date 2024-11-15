import { FontAwesome, MaterialIcons } from '@expo/vector-icons'
import { Global, Logger, Style } from '@globals'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

import HeartbeatButton from './HeartbeatButton'

export type CohereModel = {
    name: string
    endpoints: string[]
    finetuned: string
    context_length: number
    tokenizer_url: string
    default_endpoints: string[]
}

const Cohere = () => {
    const [chatCompletionsKey, setChatCompletionsKey] = useMMKVString(Global.CohereKey)
    const [chatCompletionsModel, setChatCompletionsModel] = useMMKVObject<CohereModel>(
        Global.CohereModel
    )
    const [keyInput, setKeyInput] = useState('')

    const [modelList, setModelList] = useState<CohereModel[]>([])

    useEffect(() => {
        getModelList()
    }, [])

    const getModelList = async () => {
        try {
            const url = new URL('https://api.cohere.com/v1/models').toString()

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    Authorization: `Bearer ${chatCompletionsKey}`,
                },
                method: 'GET',
            })
            if (response.status !== 200) {
                Logger.log(`Error with response: ${response.status}`, true)
                return
            }
            const rawdata = await response.text()
            const data = JSON.parse(rawdata)
            setModelList(data.models as CohereModel[])
        } catch (e) {
            setModelList([])
        }
    }

    return (
        <View style={styles.mainContainer}>
            <Text style={{ ...styles.subtitle, marginBottom: 8 }}>
                Note: Preamble will be taken from your System Prompt
            </Text>
            <Text style={styles.title}>API Key</Text>
            <Text style={styles.subtitle}>Key will not be shown</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                    style={styles.input}
                    value={keyInput}
                    onChangeText={setKeyInput}
                    placeholder="Press save to confirm key"
                    placeholderTextColor={Style.getColor('primary-text2')}
                    secureTextEntry
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        if (keyInput === '') {
                            Logger.log('No key entered!', true)
                            return
                        }
                        setChatCompletionsKey(keyInput)
                        setKeyInput('')
                        Logger.log('Key saved!', true)
                    }}>
                    <FontAwesome name="save" color={Style.getColor('primary-text1')} size={28} />
                </TouchableOpacity>
            </View>

            <HeartbeatButton
                api="https://api.cohere.com/models"
                headers={{ Authorization: `Bearer ${chatCompletionsKey}` }}
            />

            <View style={styles.dropdownContainer}>
                <Text style={styles.title}>Models</Text>

                <Text style={styles.subtitle}>API Key must be provided to get model list.</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Dropdown
                        value={chatCompletionsModel}
                        data={modelList}
                        labelField="name"
                        valueField="name"
                        onChange={(item: CohereModel) => {
                            if (item.name === chatCompletionsModel?.name) return
                            setChatCompletionsModel(item)
                        }}
                        {...Style.drawer.default}
                        placeholder={
                            modelList.length === 0 ? 'No Models Available' : 'Select Model'
                        }
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            getModelList()
                        }}>
                        <MaterialIcons
                            name="refresh"
                            color={Style.getColor('primary-text1')}
                            size={28}
                        />
                    </TouchableOpacity>
                </View>
            </View>
            {chatCompletionsModel?.name && (
                <View style={styles.modelInfo}>
                    <Text style={{ ...styles.title, marginBottom: 8 }}>
                        {chatCompletionsModel.name}
                    </Text>
                    <View style={{ flexDirection: 'row' }}>
                        <View>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Context Length
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Finetuned
                            </Text>
                        </View>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {chatCompletionsModel.context_length}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {chatCompletionsModel.finetuned ? 'True' : 'False'}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    )
}

export default Cohere

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
        flex: 1,
        color: Style.getColor('primary-text1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
    },

    button: {
        padding: 5,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        borderRadius: 4,
        marginLeft: 8,
    },

    dropdownContainer: {
        marginTop: 16,
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
