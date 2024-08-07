import { FontAwesome } from '@expo/vector-icons'
import { Color, Global, Logger, saveStringExternal } from '@globals'
import { Stack } from 'expo-router'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'

const Logs = () => {
    const [logs, setLogs] = useMMKVObject<Array<string>>(Global.Logs)

    const logitems = logs?.reverse().map((item, index) => ({ entry: item, key: index })) ?? []

    const handleExportLogs = () => {
        if (!logs) return
        const data = logs.join('\n')
        saveStringExternal('logs.txt', data, 'text/plain')
    }

    const handleFlushLogs = () => {
        Alert.alert(
            `Delete Logs`,
            `Are you sure you want to delete logs? This cannot be undone.`,
            [
                { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        Logger.flushLogs()
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        )
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                style={{ marginRight: 30, marginTop: 12 }}
                                onPress={handleFlushLogs}>
                                <FontAwesome name="trash" size={28} color={Color.Button} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ marginRight: 20, marginTop: 12 }}
                                onPress={handleExportLogs}>
                                <FontAwesome name="download" size={28} color={Color.Button} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            <FlatList
                inverted
                windowSize={3}
                data={logitems}
                keyExtractor={(item) => `${item.key}`}
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
