import { View, Text, Modal, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Color } from '@globals';
const TextBoxModal = ({
    booleans: [showModal, setShowModal],
    onConfirm = (text) => {},
    title = 'Enter Name',
}) => {
    const [text, setText] = useState('');

    useEffect(() => {
        setText('');
    }, [showModal]);

    return (
        <Modal
            visible={showModal}
            transparent
            animationType="fade"
            onDismiss={() => {
                setShowModal(false);
            }}>
            <View
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    flex: 1,
                    justifyContent: 'center',
                }}>
                <View style={styles.modalview}>
                    <Text style={styles.title}>{title}</Text>
                    <TextInput style={styles.input} value={text} onChangeText={setText} />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setShowModal(false)}>
                            <MaterialIcons name="close" size={28} color={Color.White} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                onConfirm(text);
                                setShowModal(false);
                            }}>
                            <MaterialIcons name="check" size={28} color={Color.White} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default TextBoxModal;

const styles = StyleSheet.create({
    title: {
        color: Color.White,
        marginBottom: 16,
    },

    modalview: {
        margin: 20,
        backgroundColor: Color.Background,
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },

    buttonContainer: {
        paddingTop: 8,
        flexDirection: 'row',
        alignContent: 'space-around',
    },

    modalButton: {
        marginHorizontal: 30,
    },

    input: {
        color: Color.White,
        minWidth: 280,
        backgroundColor: Color.DarkContainer,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 8,
        margin: 8,
    },
});
