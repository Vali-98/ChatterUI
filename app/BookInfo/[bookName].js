import { Lorebooks } from '@constants/Lorebooks'
import { Style } from '@globals'
import { Stack, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Entry from './Entry'
import { FlashList } from '@shopify/flash-list'

const LorebookInfo = () => {
    const { bookName } = useLocalSearchParams()
    const [book, setBook] = useState(undefined)
    useEffect(() => {
        loadBook()
    }, [])

    const loadBook = async () => {
        setBook(await Lorebooks.loadFile(bookName))
    }

    const handleUpdateBook = (key, field, value) => {
        setBook({
            ...book,
            entries: {
                ...book.entries,
                [key]: {
                    ...book.entries[key],
                    [field]: value,
                },
            },
        })
    }

    const entries = Object.keys(book?.entries ?? {}).map((key) => ({
        key: key,
        data: book.entries[key],
    }))
    return (
        <View style={{ flex: 1 }}>
            <Stack.Screen options={{ title: bookName, animation: 'fade' }} />
            {entries.length > 0 && (
                <FlashList
                    data={entries}
                    renderItem={({ item }) => (
                        <Entry data={item.data} datakey={item.key} updateBook={handleUpdateBook} />
                    )}
                    keyExtractor={(item) => item.key}
                    windowSize={1}
                    estimatedItemSize={50}
                />
            )}
        </View>
    )
}

export default LorebookInfo

const styles = StyleSheet.create({
    container: {
        marginVertical: 4,
        marginHorizontal: 16,
        padding: 16,
        backgroundColor: Style.getColor('primary-surface2'),
        borderRadius: 16,
    },

    inputContainer: {
        marginTop: 8,
        backgroundColor: Style.getColor('primary-surface3'),
        borderRadius: 8,
        paddingHorizontal: 8,
        maxHeight: 160,
    },
})

/**
 entry: {
    "uid": uid,
    "key": ["key"],
    "keysecondary": [],
    "comment": "", 
    "content": "lorem ipsum",
    "constant": false,      // always inserted
    "selective": false,  // needs both key and a secondary key
    "order": 100,     // priority, lower = higher
    "position": 0, // 'before_char' | 'after_char'
    "disable": false
 }
 */
