import { FontAwesome, MaterialIcons } from '@expo/vector-icons'
import { Global, Color, Logger } from '@globals'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'
import { OpenAIModel } from './OpenAI'
import { Dropdown } from 'react-native-element-dropdown'
import axios from 'axios'

const TextCompletions = () => {
    const [endpoint, setEndpoint] = useMMKVString(Global.CompletionsEndpoint)
    const [completionsKey, setCompletionsKey] = useMMKVString(Global.CompletionsKey)
    const [completionsModel, setCompletionsModel] = useMMKVObject<OpenAIModel>(
        Global.CompletionsModel
    )
    const [keyInput, setKeyInput] = useState('')

    const [modelList, setModelList] = useState<Array<OpenAIModel>>([])

    useEffect(() => {
        getModelList()
    }, [])

    const getModelList = () => {
        if (!endpoint) return
        axios
            .create({ timeout: 5000 })
            .get(endpoint + '/v1/models', {
                headers: { accept: 'application/json', Authorization: `Bearer ${completionsKey}` },
            })

            .then(async (response) => {
                if (response.status !== 200) {
                    Logger.log(`Error with response: ${response.status}`, true)
                    return
                }
                const { data } = response.data
                setModelList(data)
            })
            .catch((error: any) => {
                Logger.log(`Could not get models: ${error}`, true)
                setModelList([])
            })
    }

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>API Key</Text>
            <Text style={styles.subtitle}>Key will not be shown</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                    style={styles.input}
                    value={keyInput}
                    onChangeText={setKeyInput}
                    placeholder="Press save to confirm key"
                    placeholderTextColor={Color.Offwhite}
                    secureTextEntry
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        if (keyInput === '') {
                            Logger.log('No key entered!', true)
                            return
                        }
                        setCompletionsKey(keyInput)
                        setKeyInput('')
                        Logger.log('Key saved!', true)
                    }}
                />
                <TouchableOpacity>
                    <FontAwesome name="save" color={Color.Button} size={28} />
                </TouchableOpacity>
            </View>

            <Text style={styles.title}>Endpoint</Text>
            <Text style={styles.subtitle}>
                This endpoint should be cross compatible with many different services.
            </Text>
            <TextInput
                style={styles.input}
                value={endpoint}
                onChangeText={(value) => {
                    setEndpoint(value)
                }}
                placeholder="eg. https://127.0.0.1:5000"
                placeholderTextColor={Color.Offwhite}
            />

            <View style={styles.dropdownContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8 }}>
                    <Text style={{ ...styles.title, marginRight: 4 }}>Models</Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            getModelList()
                        }}>
                        <MaterialIcons name="refresh" color={Color.Button} size={28} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.subtitle}>API Key must be provided to get model list.</Text>
                <Dropdown
                    value={completionsModel}
                    data={modelList}
                    labelField="id"
                    valueField="id"
                    onChange={(item: OpenAIModel) => {
                        if (item.id === completionsModel?.id) return
                        setCompletionsModel(item)
                    }}
                    style={styles.dropdownbox}
                    selectedTextStyle={styles.selected}
                    containerStyle={styles.dropdownbox}
                    itemTextStyle={{ color: Color.Text }}
                    itemContainerStyle={{
                        backgroundColor: Color.DarkContainer,
                        borderRadius: 8,
                    }}
                    activeColor={Color.Container}
                    placeholderStyle={{ color: Color.Offwhite }}
                    placeholder={modelList.length === 0 ? 'No Models Available' : 'Select Model'}
                />
            </View>
            {completionsModel?.id && (
                <View style={styles.modelInfo}>
                    <Text style={{ ...styles.title, marginBottom: 8 }}>{completionsModel.id}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <View>
                            <Text style={{ color: Color.Offwhite }}>Id</Text>
                            <Text style={{ color: Color.Offwhite }}>Object</Text>
                            <Text style={{ color: Color.Offwhite }}>Created</Text>
                            <Text style={{ color: Color.Offwhite }}>Owned By</Text>
                        </View>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: Color.Offwhite }}>: {completionsModel.id}</Text>
                            <Text style={{ color: Color.Offwhite }}>
                                : {completionsModel.object}
                            </Text>
                            <Text style={{ color: Color.Offwhite }}>
                                : {completionsModel.created}
                            </Text>
                            <Text style={{ color: Color.Offwhite }}>
                                : {completionsModel.owned_by}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    )
}

export default TextCompletions

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },

    title: {
        color: Color.Text,
        fontSize: 20,
    },

    subtitle: {
        color: Color.Offwhite,
    },

    input: {
        flex: 1,
        color: Color.Text,
        backgroundColor: Color.DarkContainer,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
    },

    button: {
        padding: 5,
        backgroundColor: Color.DarkContainer,
        borderRadius: 4,
        marginLeft: 8,
    },

    dropdownContainer: {
        marginTop: 16,
    },

    dropdownbox: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginVertical: 8,
        backgroundColor: Color.DarkContainer,
        borderRadius: 8,
    },

    selected: {
        color: Color.Text,
    },

    modelInfo: {
        borderRadius: 8,
        backgroundColor: Color.Container,
        flex: 1,
        padding: 16,
        marginTop: 12,
    },
})
