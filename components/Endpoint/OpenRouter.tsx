import { FontAwesome } from '@expo/vector-icons'
import { Global, Style, Logger } from '@globals'
import { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

type OpenRouterModel = {
    architecture: { instruct_type: string; modality: string; tokenizer: string }
    id: string
    name: string
    description: string
    pricing: { completion: string; prompt: string }
    context_length: number
    top_provider: { is_moderated: boolean; max_completion_tokens: number | null }
    per_request_limits: { prompt_tokens: string; completion_tokens: string }
}

const OpenRouter = () => {
    const [openRouterModel, setOpenRouterModel] = useMMKVObject<OpenRouterModel>(
        Global.OpenRouterModel
    )
    const [openRouterKey, setOpenRouterKey] = useMMKVString(Global.OpenRouterKey)
    const [keyInput, setKeyInput] = useState('')

    const [modelList, setModelList] = useState<Array<OpenRouterModel>>([])

    const getModels = useCallback(async () => {
        const modelresults = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: { accept: 'application/json' },
        })
            .then(async (modelresults) => {
                const list = (await modelresults.json()).data
                setModelList(list)
            })
            .catch(() => {
                Logger.log(`Could not get OpenRouter Mddels`, true)
            })
    }, [modelList])

    useEffect(() => {
        getModels()
    }, [])

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>API Key</Text>
            <Text style={styles.subtitle}>Key will not be shown</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                    style={styles.input}
                    value={keyInput}
                    onChangeText={(value) => {
                        setKeyInput(value)
                    }}
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
                        setOpenRouterKey(keyInput)
                        setKeyInput('')
                        Logger.log('Key saved!', true)
                    }}>
                    <FontAwesome name="save" color={Style.getColor('primary-text1')} size={28} />
                </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
                <Text style={{ color: Style.getColor('primary-text1'), fontSize: 16 }}>Model</Text>
                <Dropdown
                    value={openRouterModel}
                    data={modelList}
                    labelField="id"
                    valueField="id"
                    onChange={(item) => {
                        if (item.id === openRouterModel?.id) return
                        setOpenRouterModel(item)
                    }}
                    {...Style.drawer.default}
                    placeholder="Select Model"
                />
            </View>

            {openRouterModel !== undefined && (
                <View style={styles.modelInfo}>
                    <Text style={{ ...styles.title, marginBottom: 8 }}>{openRouterModel.id}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <View>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Context Size
                            </Text>
                            {openRouterModel.per_request_limits && (
                                <View>
                                    <Text style={{ color: Style.getColor('primary-text2') }}>
                                        Completion Tokens
                                    </Text>
                                    <Text style={{ color: Style.getColor('primary-text2') }}>
                                        Prompt Tokens
                                    </Text>
                                </View>
                            )}
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Completion Cost
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Prompt Cost
                            </Text>
                        </View>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {openRouterModel.context_length}
                            </Text>
                            {openRouterModel.per_request_limits && (
                                <View>
                                    <Text style={{ color: Style.getColor('primary-text2') }}>
                                        : {openRouterModel.per_request_limits.prompt_tokens}
                                    </Text>
                                    <Text style={{ color: Style.getColor('primary-text2') }}>
                                        : {openRouterModel.per_request_limits.completion_tokens}
                                    </Text>
                                </View>
                            )}
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {openRouterModel.pricing.completion}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {openRouterModel.pricing.prompt}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    )
}

export default OpenRouter

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },

    title: {
        color: Style.getColor('primary-text1'),
        fontSize: 20,
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
    },

    input: {
        flex: 1,
        color: Style.getColor('primary-text2'),
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
