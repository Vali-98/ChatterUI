import { FontAwesome } from '@expo/vector-icons'
import { Global, Logger, Style } from '@globals'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

type MancerModel = {
    id: string
    limits: {
        completion: number
        context: number
    }
    name: string
    pricing: {
        completion: number
        prompt: number
    }
}

const Mancer = () => {
    const [mancerModel, setMancerModel] = useMMKVObject<MancerModel>(Global.MancerModel)
    const [mancerKey, setMancerKey] = useMMKVString(Global.MancerKey)
    const [keyInput, setKeyInput] = useState<string>('')

    const [modelList, setModelList] = useState<Array<MancerModel>>([])

    const getModels = async () => {
        const modelresults = await fetch(`https://mancer.tech/oai/v1/models`, {
            method: 'GET',
            headers: { accept: 'application/json' },
        }).catch(() => {
            Logger.log(`Could not get Mancer models.`, true)
        })
        if (!modelresults) return
        const list = (await modelresults.json()).data
        setModelList(list)
    }

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
                            Logger.log('No API Key Entered!', true)
                            return
                        }
                        setMancerKey(keyInput)
                        setKeyInput('')
                        Logger.log('Key Saved!', true)
                    }}>
                    <FontAwesome name="save" color={Style.getColor('primary-text1')} size={28} />
                </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
                <Text style={{ color: Style.getColor('primary-text1'), fontSize: 16 }}>Model</Text>
                <Dropdown
                    value={mancerModel}
                    data={modelList}
                    labelField="name"
                    valueField="id"
                    onChange={(item) => {
                        if (item.name === mancerModel?.name) return
                        setMancerModel(item)
                    }}
                    placeholder="Select Model"
                    {...Style.drawer.default}
                />
            </View>

            {mancerModel !== undefined && (
                <View style={styles.modelInfo}>
                    <Text style={{ ...styles.title, marginBottom: 8 }}>{mancerModel.name}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <View>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Context Size
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Generation Limit
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Completion Cost
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                Prompt Cost
                            </Text>
                        </View>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {mancerModel.limits.context}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {mancerModel.limits.completion}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {mancerModel.pricing.completion}
                            </Text>
                            <Text style={{ color: Style.getColor('primary-text2') }}>
                                : {mancerModel.pricing.prompt}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    )
}

export default Mancer

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
