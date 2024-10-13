import { Alert } from '@components/Alert'
import AnimatedView from '@components/AnimatedView'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Logger, Style, saveStringToDownload } from '@globals'
import { FlashList } from '@shopify/flash-list'
import { Stack } from 'expo-router'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'

const Logs = () => {
    const [logs, setLogs] = useMMKVObject<string[]>(Global.Logs)

    const logitems = logs?.reverse().map((item, index) => ({ entry: item, key: index })) ?? []

    const handleExportLogs = () => {
        if (!logs) return
        const data = logs.join('\n')
        saveStringToDownload(data, 'logs.txt', 'utf8')
            .then(() => {
                Logger.log('Logs Downloaded!', true)
            })
            .catch((e) => {
                Logger.log(`Could Not Export Logs: ${e}`, true)
            })
    }

    const handleFlushLogs = () => {
        Alert.alert({
            title: `Delete Logs`,
            description: `Are you sure you want to delete all logs? This cannot be undone.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Logs',
                    onPress: async () => {
                        Logger.flushLogs()
                    },
                    type: 'warning',
                },
            ],
        })
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
