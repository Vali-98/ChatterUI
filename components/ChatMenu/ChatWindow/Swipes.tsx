import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import { Color, Logger } from '@globals'
import React from 'react'
import { ChatEntry, Chats } from '@constants/Chat'
import { useShallow } from 'zustand/react/shallow'
import { continueResponse, generateResponse, regenerateResponse } from '@constants/Inference'

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

    const isLastAltGreeting = id === 0 && message.swipe_id === message.swipes.length - 1

    return (
        <View style={styles.swipesItem}>
            <TouchableOpacity
                onPress={handleSwipeLeft}
                disabled={nowGenerating || message.swipe_id === 0}>
                <AntDesign
                    name="left"
                    size={20}
                    color={message.swipe_id === 0 ? Color.ButtonDisabled : Color.Button}
                />
            </TouchableOpacity>

            {id !== 0 && (
                <TouchableOpacity onPress={regenerateResponse} disabled={nowGenerating}>
                    <AntDesign
                        name="retweet"
                        size={20}
                        color={nowGenerating ? Color.ButtonDisabled : Color.Button}
                    />
                </TouchableOpacity>
            )}

            <Text style={styles.swipeText}>
                {message.swipe_id + 1} / {message.swipes.length}
            </Text>

            {id !== 0 && (
                <TouchableOpacity onPress={continueResponse} disabled={nowGenerating}>
                    <AntDesign
                        name="forward"
                        size={20}
                        color={nowGenerating ? Color.ButtonDisabled : Color.Button}
                    />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={handleSwipeRight}
                disabled={nowGenerating || isLastAltGreeting}>
                <AntDesign
                    name="right"
                    size={20}
                    color={isLastAltGreeting || nowGenerating ? Color.ButtonDisabled : Color.Button}
                />
            </TouchableOpacity>
        </View>
    )
}

export default Swipes

const styles = StyleSheet.create({
    swipesItem: {
        flexDirection: 'row',
        marginVertical: 8,
        marginHorizontal: 8,
        justifyContent: 'space-between',
    },

    swipeText: {
        color: Color.Text,
    },

    swipeTextContainer: {
        alignItems: 'center',
        flex: 1,
    },
})
