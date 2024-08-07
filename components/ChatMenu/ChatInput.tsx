import { useInference } from '@constants/Chat'
import { generateResponse } from '@constants/Inference'
import { MaterialIcons } from '@expo/vector-icons'
import { AppSettings, Characters, Chats, Logger, Style } from '@globals'
import React, { useState } from 'react'
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

const ChatInput = () => {
    'use no memo'
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)

    const { insertEntry } = Chats.useChat((state) => ({
        insertEntry: state.addEntry,
    }))

    const { nowGenerating } = useInference((state) => ({
        nowGenerating: state.nowGenerating,
    }))

    const { charName } = Characters.useCharacterCard(
        useShallow((state) => ({
            charName: state?.card?.data.name,
        }))
    )

    const { userName } = Characters.useUserCard(
        useShallow((state) => ({ userName: state.card?.data.name }))
    )

    const [newMessage, setNewMessage] = useState<string>('')

    const abortResponse = async () => {
        Logger.log(`Aborting Generation`)
        const abortFunction = useInference.getState().abortFunction
        if (abortFunction) abortFunction()
    }

    const handleSend = async () => {
        if (newMessage.trim() !== '') await insertEntry(userName ?? '', true, newMessage)
        await insertEntry(charName ?? '', false, '')
        setNewMessage((message) => '')
        generateResponse()
    }

    return (
        <View style={styles.inputContainer}>
            <TextInput
                style={styles.input}
                placeholder="Message..."
                placeholderTextColor={Style.getColor('primary-text2')}
                value={newMessage}
                onChangeText={(text) => setNewMessage(text)}
                multiline
                blurOnSubmit={sendOnEnter}
                onSubmitEditing={sendOnEnter ? handleSend : undefined}
            />

            {nowGenerating ? (
                <TouchableOpacity style={styles.stopButton} onPress={abortResponse}>
                    <MaterialIcons
                        name="stop"
                        color={Style.getColor('destructive-text1')}
                        size={28}
                    />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <MaterialIcons
                        name="send"
                        color={Style.getColor('primary-surface1')}
                        size={28}
                    />
                </TouchableOpacity>
            )}
        </View>
    )
}

export default ChatInput

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flex: 1,
    },

    input: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        flex: 1,
        borderWidth: 1,
        borderColor: Style.getColor('primary-brand'),
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 8,
    },

    sendButton: {
        borderRadius: 8,
        minWidth: 44,
        minHeight: 44,
        backgroundColor: Style.getColor('primary-brand'),
        padding: 8,
    },

    stopButton: {
        borderRadius: 8,
        minWidth: 44,
        minHeight: 44,
        backgroundColor: Style.getColor('destructive-brand'),
        padding: 8,
    },
})
