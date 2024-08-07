import { Lorebooks } from '@constants/Lorebooks'
import { Stack, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Text, ScrollView } from 'react-native'

const LorebookEntryInfo = () => {
    const { bookName } = useLocalSearchParams()
    const [book, setBook] = useState(undefined)

    useEffect(() => {
        loadBook()
    }, [])

    const loadBook = async () => {
        setBook(await Lorebooks.loadFile(bookName))
    }

    return (
        <ScrollView>
            <Stack.Screen options={{ title: bookName, animation: 'fade' }} />

            {book === undefined &&
                Object.keys(book.entries).map((key, index) => (
                    <Text key={index}>{book.entries[key].content}</Text>
                ))}
        </ScrollView>
    )
}

export default LorebookEntryInfo
