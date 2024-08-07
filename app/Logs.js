import { FontAwesome } from '@expo/vector-icons'
import { Color, Global, saveStringExternal } from '@globals'
import { Stack } from 'expo-router'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'

const Logs = () => {
    const [logs, setLogs] = useMMKVObject(Global.Logs)

    const logitems = logs.reverse().map((item, index) => ({ entry: item, key: index }))

    const handleExportLogs = () => {
        const data = logs.join('\n')
        saveStringExternal('logs.txt', data, 'text/plain')
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <TouchableOpacity
                            style={{ marginRight: 20, marginTop: 12 }}
                            onPress={handleExportLogs}>
                            <FontAwesome name="download" size={28} color={Color.Button} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <FlatList
                inverted
                windowSize={3}
                data={logitems}
                keyExtractor={(item) => item.key}
                renderItem={({ item, index }) => <Text style={styles.entry}>{item.entry}</Text>}
            />
        </View>
    )
}

export default Logs

const styles = StyleSheet.create({
    container: {
        backgroundColor: Color.Black,
        margin: 16,
        padding: 16,
        borderRadius: 16,
    },
    entry: {
        color: Color.Text,
    },
})
