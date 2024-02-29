import { FontAwesome } from '@expo/vector-icons'
import { Global, Style, Logger } from '@globals'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

export type OpenAIModel = {
    id: string
    object: string
    created: number
    owned_by: string
}

const OpenAI = () => {
    const [openAIModel, setOpenAIModel] = useMMKVObject<OpenAIModel>(Global.OpenAIModel)
    const [openAIKey, setOpenAIKey] = useMMKVString(Global.OpenAIKey)
    const [keyInput, setKeyInput] = useState<string>('')

    const [modelList, setModelList] = useState<Array<OpenAIModel>>([])

    const getModels = async () => {
        const modelresults = await fetch(`https://api.openai.com/v1/models`, {
            method: 'GET',
            headers: { accept: 'application/json', Authorization: `Bearer ${openAIKey}` },
        }).catch(() => {
            Logger.log(`Could not get OpenAI models.`, true)
        })
        if (!modelresults) return

        if (modelresults.status !== 200) {
            Logger.log(`Could not get OpenAI models. Ensure API Key is entered.`, true)
            return
        }
        const list = (await modelresults.json()).data
        setModelList(list.filter((item: OpenAIModel) => item.id.startsWith('gpt')))
    }

    useEffect(() => {
        getModels()
    }, [openAIKey])

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
                            Logger.log('No API Key Entered!', true)
                            return
                        }
                        setOpenAIKey(keyInput)
                        setKeyInput('')
                        Logger.log('Key Saved!', true)
                    }}>
                    <FontAwesome name="save" color={Style.getColor('primary-text1')} size={28} />
                </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
                <Text style={{ color: Style.getColor('primary-text1'), fontSize: 16 }}>Model</Text>
                <Text style={styles.subtitle}>API Key must be provided to get model list.</Text>
                <Dropdown
                    value={openAIModel}
                    data={modelList}
                    labelField="id"
                    valueField="id"
                    onChange={(item) => {
                        if (item.id === openAIModel?.id) return
                        setOpenAIModel(item)
                    }}
                    placeholder={modelList.length === 0 ? 'No Models Available' : 'Select Model'}
                    {...Style.drawer.default}
                />
            </View>
            {openAIModel?.id && (
                <View style={styles.modelInfo}>
                    <Text style={{ ...styles.title, marginBottom: 8 }}>{openAIModel.id}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <View>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Id</Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Object</Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Created</Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>Owned By</Text>
                        </View>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {openAIModel.id}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {openAIModel.object}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {openAIModel.created}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {openAIModel.owned_by}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    )
}

export default OpenAI

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
