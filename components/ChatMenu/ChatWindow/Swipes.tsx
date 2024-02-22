import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import { Color } from '@globals'
import React from 'react'
import { ChatEntry, Chats } from '@constants/Chat'
import { useShallow } from 'zustand/react/shallow'
import { generateResponse } from '@constants/Inference'

type SwipesProps = {
    message: ChatEntry
    nowGenerating: boolean
    id: number
}

const Swipes: React.FC<SwipesProps> = ({ message, nowGenerating, id }) => {
    const { swipeChat, addSwipe, saveChat } = Chats.useChat(
        useShallow((state) => ({
            swipeChat: state.swipe,
            addSwipe: state.addSwipe,
            saveChat: state.save,
        }))
    )

    const handleSwipeLeft = () => {
        swipeChat(id, -1)
        saveChat()
    }

    const handleSwipeRight = async () => {
        const atLimit = swipeChat(id, 1)
        await saveChat()
        if (atLimit && id !== 0) {
            addSwipe()
            generateResponse()
        }
    }

    return (
        <View style={styles.swipesItem}>
            {!nowGenerating && (
                <TouchableOpacity onPress={handleSwipeLeft} disabled={message.swipe_id === 0}>
                    <AntDesign
                        name="left"
                        size={20}
                        color={message.swipe_id === 0 ? Color.Offwhite : Color.Button}
                    />
                </TouchableOpacity>
            )}
            <View style={styles.swipeTextContainer}>
                <Text style={styles.swipeText}>
                    {message.swipe_id + 1} / {message.swipes.length}
                </Text>
            </View>

            {!nowGenerating && (
                <TouchableOpacity onPress={handleSwipeRight}>
                    <AntDesign name="right" size={20} color={Color.Button} />
                </TouchableOpacity>
            )}
        </View>
    )
}

export default Swipes

const styles = StyleSheet.create({
    swipesItem: {
        flexDirection: 'row',
        marginVertical: 8,
        marginHorizontal: 8,
    },

    swipeText: {
        color: Color.Text,
    },

    swipeTextContainer: {
        alignItems: 'center',
        flex: 1,
    },
})
