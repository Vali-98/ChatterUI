import { FontAwesome } from '@expo/vector-icons'
import { Global, Color } from '@globals'
import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ToastAndroid } from 'react-native'
import { useMMKVString } from 'react-native-mmkv'

const TextCompletions = () => {
    const [endpoint, setEndpoint] = useMMKVString(Global.CompletionsEndpoint)
    const [completionsKey, setCompletionsKey] = useMMKVString(Global.CompletionsKey)
    const [keyInput, setKeyInput] = useState('')
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
                            ToastAndroid.show('No key entered!', 2000)
                            return
                        }
                        setCompletionsKey(keyInput)
                        setKeyInput('')
                        ToastAndroid.show('Key saved!', 2000)
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
})
