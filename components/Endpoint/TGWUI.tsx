import { Global, Style } from '@globals'
import { View, Text, StyleSheet, TextInput } from 'react-native'
import { useMMKVString } from 'react-native-mmkv'

const TGWUI = () => {
    const [streamEnd, setStreamEnd] = useMMKVString(Global.TGWUIStreamingEndpoint)

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>Endpoint</Text>
            <TextInput
                style={styles.input}
                value={streamEnd}
                onChangeText={(value) => {
                    setStreamEnd(value)
                }}
                placeholder="eg. https://127.0.0.1:5000"
                placeholderTextColor={Style.getColor('primary-text2')}
            />
        </View>
    )
}

export default TGWUI

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },

    title: {
        color: Style.getColor('primary-text1'),
    },

    input: {
        color: Style.getColor('primary-text2'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
    },
})
