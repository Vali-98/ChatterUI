import ButtonPrimary from '@components/Buttons/ButtonPrimary'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { APIState } from 'constants/API/APIManagerState'
import { Style } from 'constants/Style'
import { Stack, useRouter } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import APIValueItem from './APIValueItem'

const APIManager = () => {
    // eslint-disable-next-line react-compiler/react-compiler
    'use no memo'
    const { apiValues } = APIState.useAPIState((state) => ({
        apiValues: state.values,
    }))
    const router = useRouter()
    return (
        <View style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    title: 'API Manager',
                    headerRight: () => (
                        <Pressable
                            onPressIn={() => {
                                router.push('/components/APIManager/TemplateManager')
                            }}>
                            <AntDesign
                                name="setting"
                                color={Style.getColor('primary-text2')}
                                size={26}
                            />
                        </Pressable>
                    ),
                }}
            />
            {apiValues.length > 0 && (
                <FlatList
                    data={apiValues}
                    keyExtractor={(item, index) => item.configName + index}
                    renderItem={({ item, index }) => <APIValueItem item={item} index={index} />}
                />
            )}

            {apiValues.length === 0 && (
                <View style={styles.emptyListContainer}>
                    <Ionicons
                        name="cloud-offline-outline"
                        size={64}
                        color={Style.getColor('primary-text3')}
                    />
                    <Text style={styles.emptyListText}>No Connections Added</Text>
                </View>
            )}

            <ButtonPrimary
                onPress={() => router.push('/components/APIManager/AddAPI')}
                label="Add Connection"
            />
        </View>
    )
}

export default APIManager

const styles = StyleSheet.create({
    mainContainer: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
        flex: 1,
    },

    emptyListContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyListText: {
        color: Style.getColor('primary-text2'),
        fontStyle: 'italic',
        marginTop: 12,
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
        color: Style.getColor('primary-text1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 8,
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
