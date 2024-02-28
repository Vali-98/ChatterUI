import { View, Text, StyleSheet, TouchableHighlight } from 'react-native'
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
            <TouchableHighlight
                style={styles.swipeButton}
                onPress={handleSwipeLeft}
                disabled={nowGenerating || message.swipe_id === 0}>
                <AntDesign
                    name="left"
                    size={20}
                    color={
                        message.swipe_id === 0 || nowGenerating
                            ? Color.ButtonDisabled
                            : Color.Button
                    }
                />
            </TouchableHighlight>

            {id !== 0 && (
                <TouchableHighlight
                    onPress={regenerateResponse}
                    disabled={nowGenerating}
                    style={styles.swipeButton}>
                    <AntDesign
                        name="retweet"
                        size={20}
                        color={nowGenerating ? Color.ButtonDisabled : Color.Button}
                    />
                </TouchableHighlight>
            )}

            <Text style={styles.swipeText}>
                {message.swipe_id + 1} / {message.swipes.length}
            </Text>

            {id !== 0 && (
                <TouchableHighlight
                    onPress={continueResponse}
                    disabled={nowGenerating}
                    style={styles.swipeButton}>
                    <AntDesign
                        name="forward"
                        size={20}
                        color={nowGenerating ? Color.ButtonDisabled : Color.Button}
                    />
                </TouchableHighlight>
            )}

            <TouchableHighlight
                style={styles.swipeButton}
                onPress={handleSwipeRight}
                disabled={nowGenerating || isLastAltGreeting}>
                <AntDesign
                    name="right"
                    size={20}
                    color={isLastAltGreeting || nowGenerating ? Color.ButtonDisabled : Color.Button}
                />
            </TouchableHighlight>
        </View>
    )
}

export default Swipes

const styles = StyleSheet.create({
    swipesItem: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        flex: 1,
        marginTop: 4,
    },

    swipeText: {
        color: Color.Text,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },

    swipeButton: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 4,
    },
})
