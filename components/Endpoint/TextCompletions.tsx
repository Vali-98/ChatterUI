import { FontAwesome, MaterialIcons } from '@expo/vector-icons'
import { Global, Logger, Style } from '@globals'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'
import { OpenAIModel } from './OpenAI'
import { Dropdown } from 'react-native-element-dropdown'

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

    const getModelList = async () => {
        if (!endpoint) return

        const response = await fetch(endpoint + '/v1/models', {
            headers: { accept: 'application/json', Authorization: `Bearer ${completionsKey}` },
        })

        if (response.status !== 200) {
            Logger.log(`Error with response: ${response.status}`, true)
            return
        }
        const { data } = await response.json()
        setModelList(data)
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
                        setCompletionsKey(keyInput)
                        setKeyInput('')
                        Logger.log('Key saved!', true)
                    }}>
                    <FontAwesome name="save" color={Style.getColor('primary-text1')} size={28} />
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
                placeholderTextColor={Style.getColor('primary-text2')}
            />

            <View style={styles.dropdownContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8 }}>
                    <Text style={{ ...styles.title, marginRight: 4 }}>Models</Text>
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
                    {...Style.drawer.default}
                    placeholder={modelList.length === 0 ? 'No Models Available' : 'Select Model'}
                />
            </View>
            {completionsModel?.id && (
                <View style={styles.modelInfo}>
                    <Text style={{ ...styles.title, marginBottom: 8 }}>{completionsModel.id}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <View>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Id</Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Object</Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Created</Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Owned By</Text>
                        </View>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {completionsModel.id}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {completionsModel.object}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {completionsModel.created}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
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
        padding: 16,
        marginTop: 12,
    },
})
