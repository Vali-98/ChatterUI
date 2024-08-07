import TextBoxModal from '@components/TextBoxModal'
import { Lorebooks } from '@constants/Lorebooks'
import { FontAwesome } from '@expo/vector-icons'
import { Stack, useRouter } from 'expo-router'
import { Style } from '@globals'
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native'

const LorebookMenu = () => {
    const router = useRouter()
    const [books, setBooks] = useState([])
    const [showNewBook, setShowNewBook] = useState(false)
    const [searchData, setSearchData] = useState('')

    useEffect(() => {
        loadBooksList()
    }, [])

    const loadBooksList = async () => {
        setBooks((await Lorebooks.getFileList()).map((item) => item.replace('.json', '')))
    }

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    animation: 'slide_from_left',
                    title: `Lorebooks`,
                }}
            />
            <View style={styles.bar}>
                <View style={styles.searchBox}>
                    <TextInput style={styles.searchInput} onChangeText={setSearchData} />
                    <FontAwesome name="search" size={15} color={Style.getColor('primary-text1')} />
                </View>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        Lorebooks.uploadFile().then(() => loadBooksList())
                    }}>
                    <FontAwesome size={24} name="upload" color={Style.getColor('primary-text1')} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        setShowNewBook(true)
                    }}>
                    <FontAwesome size={24} name="plus" color={Style.getColor('primary-text1')} />
                </TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 16 }}>
                {books.length > 0 &&
                    books
                        .filter((book) => {
                            return book.toLowerCase().includes(searchData.toLowerCase())
                        })
                        .map((book, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.lorebookItem}
                                onPress={() => router.push(`/BookInfo/${book}`)}>
                                <Text style={{ color: Style.getColor('primary-text1') }}>
                                    {book}
                                </Text>
                                <TouchableOpacity>
                                    <FontAwesome
                                        color={Style.getColor('primary-text1')}
                                        size={24}
                                        name="trash"
                                        onPress={() =>
                                            Lorebooks.deleteFile(book).then(() => loadBooksList())
                                        }
                                    />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
            </ScrollView>

            <TextBoxModal
                title="Create New Lorebook"
                booleans={[showNewBook, setShowNewBook]}
                onConfirm={(text) => {}}
            />
        </View>
    )
}

export default LorebookMenu

const styles = StyleSheet.create({
    mainContainer: {
        margin: 16,
        paddingBottom: 150,
    },

    bar: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    searchBox: {
        flex: 1,
        borderRadius: 16,
        backgroundColor: Style.getColor('primary-surface2'),
        padding: 8,
        color: Style.getColor('primary-text1'),
        flexDirection: 'row',
        alignItems: 'center',
    },

    searchInput: {
        flex: 1,
        color: Style.getColor('primary-text1'),
    },

    button: {
        padding: 8,
        backgroundColor: Style.getColor('primary-surface2'),
        borderRadius: 4,
        marginLeft: 8,
    },

    lorebookItem: {
        padding: 16,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Style.getColor('primary-surface3'),
        borderRadius: 16,
        marginVertical: 4,
    },
})
