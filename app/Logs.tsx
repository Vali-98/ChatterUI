import { FontAwesome } from '@expo/vector-icons'
import { Global, Logger, Style, saveStringExternal } from '@globals'
import { Stack } from 'expo-router'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useMMKVObject } from 'react-native-mmkv'
import AnimatedView from '@components/AnimatedView'
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
        <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
            <Stack.Screen
                options={{
                    animation: 'fade',
                    headerRight: () => (
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                style={{ marginRight: 30, marginTop: 12 }}
                                onPress={handleFlushLogs}>
                                <FontAwesome
                                    name="trash"
                                    size={28}
                                    color={Style.getColor('primary-text1')}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ marginRight: 20, marginTop: 12 }}
                                onPress={handleExportLogs}>
                                <FontAwesome
                                    name="download"
                                    size={28}
                                    color={Style.getColor('primary-text1')}
                                />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />

            <View style={styles.container}>
                <FlashList
                    inverted
                    estimatedItemSize={30}
                    data={logitems}
                    keyExtractor={(item) => `${item.key}`}
                    renderItem={({ item, index }) => <Text style={styles.entry}>{item.entry}</Text>}
                />
            </View>
        </AnimatedView>
    )
}

export default Logs

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        margin: 16,
        padding: 16,
        borderRadius: 16,
        flex: 1,
    },
    entry: {
        color: Style.getColor('primary-text1'),
    },
})
