import { Lorebooks } from '@constants/Lorebooks'
import { Color } from '@globals'
import { Stack, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Text, ScrollView, StyleSheet, FlatList, View } from 'react-native'

const LorebookInfo = () => {
    const { bookName } = useLocalSearchParams()
    const [book, setBook] = useState(undefined)

    useEffect(() => {
        loadBook()
    }, [])

    const loadBook = async () => {
        setBook(await Lorebooks.loadFile(bookName))
    }

    const Entry = ({ data }) => {
        return (
            <View style={styles.container}>
                <Text style={{ color: Color.Text }}>{data?.content}</Text>
            </View>
        )
    }

    const entries = Object.keys(book?.entries ?? {}).map((key) => ({
        key: key,
        data: book.entries[key],
    }))
    return (
        <View>
            <Stack.Screen options={{ title: bookName, animation: 'fade' }} />
            {entries.length > 0 && (
                <FlatList
                    data={entries}
                    renderItem={(item) => <Entry data={item.item.data} />}
                    windowSize={3}
                    keyExtractor={(item) => item.key}
                />
            )}
        </View>
    )
}

export default LorebookInfo

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
        marginHorizontal: 16,
        padding: 4,
        backgroundColor: Color.Container,
    },
})
