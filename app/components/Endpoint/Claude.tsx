import { FontAwesome } from '@expo/vector-icons'
import { Global, Logger, Style } from '@globals'
import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

type ClaudeModel = {
    name: string
    id: string
}

const modelList: ClaudeModel[] = [
    { name: 'Claude 3 Haiku', id: 'claude-3-haiku-20240307' },
    { name: 'Claude 3 Sonnet', id: 'claude-3-sonnet-20240229' },
    { name: 'Claude 3 Opus', id: 'claude-3-opus-20240229' },
    { name: 'Claude 3.5 Sonnnet', id: 'claude-3-5-sonnet-20240620' },
]

const Claude = () => {
    const [claudeModel, setClaudeModel] = useMMKVObject<ClaudeModel>(Global.ClaudeModel)
    const [claudeEndpoint, setClaudeEndpoint] = useMMKVString(Global.ClaudeEndpoint)
    const [claudePrefill, setClaudePrefill] = useMMKVString(Global.ClaudePrefill)
    const [claudeFirstMessage, setClaudeFirstMessage] = useMMKVString(Global.ClaudeFirstMessage)

    const [claudeKey, setClaudeKey] = useMMKVString(Global.ClaudeAPIKey)
    const [keyInput, setKeyInput] = useState<string>('')

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>URL</Text>
            <Text style={styles.subtitle}>Leave blank to use default endpoint</Text>
            <TextInput
                style={styles.input}
                value={claudeEndpoint}
                onChangeText={(value) => {
                    setClaudeEndpoint(value)
                }}
                placeholder="https://api.anthropic.com/v1/messages"
                placeholderTextColor={Style.getColor('primary-text2')}
            />

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
                        setClaudeKey(keyInput)
                        setKeyInput('')
                        Logger.log('Key Saved!', true)
                    }}>
                    <FontAwesome name="save" color={Style.getColor('primary-text1')} size={28} />
                </TouchableOpacity>
            </View>

            <View style={styles.dropdownContainer}>
                <Text style={styles.title}>Model</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Dropdown
                        value={claudeModel}
                        data={modelList}
                        labelField="name"
                        valueField="id"
                        onChange={(item) => {
                            if (item.name === claudeModel?.name) return
                            setClaudeModel(item)
                        }}
                        placeholder="Select Model"
                        {...Style.drawer.default}
                    />
                </View>
            </View>

            <Text style={styles.title}>First Message</Text>
            <Text style={styles.subtitle}>Default first message sent to Claude</Text>
            <TextInput
                style={{ ...styles.input, textAlignVertical: 'top' }}
                value={claudeFirstMessage}
                onChangeText={(value) => {
                    setClaudeFirstMessage(value)
                }}
                numberOfLines={4}
                placeholder="..."
                placeholderTextColor={Style.getColor('primary-text2')}
            />

            <Text style={styles.title}>Prefill</Text>
            <Text style={styles.subtitle}>Leave blank to use default endpoint</Text>
            <TextInput
                style={{ ...styles.input, textAlignVertical: 'top' }}
                value={claudePrefill}
                onChangeText={(value) => {
                    setClaudePrefill(value)
                }}
                numberOfLines={4}
                placeholder="This prefill occurs on the final assistant message"
                placeholderTextColor={Style.getColor('primary-text2')}
            />
        </View>
    )
}

export default Claude

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
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
})
