import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Lorebooks } from '@constants/Lorebooks';
import { Color } from '@globals';
import { FontAwesome } from '@expo/vector-icons';
import TextBoxModal from '@components/TextBoxModal';

const LorebookMenu = () => {
    const router = useRouter();
    const [books, setBooks] = useState([]);
    const [showNewBook, setShowNewBook] = useState(false);
    const [searchData, setSearchData] = useState('');

    useEffect(() => {
        loadBooksList();
    }, []);

    const loadBooksList = async () => {
        setBooks((await Lorebooks.getFileList()).map((item) => item.replace('.json', '')));
    };

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
                    <FontAwesome name="search" size={15} color={Color.White} />
                </View>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        Lorebooks.uploadFile().then(() => loadBooksList());
                    }}>
                    <FontAwesome size={24} name="upload" color={Color.Button} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        setShowNewBook(true);
                    }}>
                    <FontAwesome size={24} name="plus" color={Color.Button} />
                </TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 16 }}>
                {books.length > 0 &&
                    books
                        .filter((book) => {
                            return book.toLowerCase().includes(searchData.toLowerCase());
                        })
                        .map((book, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.lorebookItem}
                                onPress={() => router.push(`/LorebookInfo/${book}`)}>
                                <Text style={{ color: Color.Text }}>{book}</Text>
                                <TouchableOpacity>
                                    <FontAwesome
                                        color={Color.White}
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
    );
};

export default LorebookMenu;

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
        backgroundColor: Color.DarkContainer,
        padding: 8,
        color: Color.Text,
        flexDirection: 'row',
        alignItems: 'center',
    },

    searchInput: {
        flex: 1,
        color: Color.Text,
    },

    button: {
        padding: 8,
        backgroundColor: Color.DarkContainer,
        borderRadius: 4,
        marginLeft: 8,
    },

    lorebookItem: {
        padding: 16,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Color.Container,
        borderRadius: 16,
        marginVertical: 4,
    },
});
