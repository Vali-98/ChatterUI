import { AntDesign } from '@expo/vector-icons'
import { Style } from '@globals'
import { Chats } from 'app/constants/Chat'
import { continueResponse, generateResponse, regenerateResponse } from 'app/constants/Inference'
import React from 'react'
import { View, Text, StyleSheet, TouchableHighlight } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

type SwipesProps = {
    nowGenerating: boolean
    isGreeting: boolean
    index: number
}

const Swipes: React.FC<SwipesProps> = ({ nowGenerating, isGreeting, index }) => {
    const { swipeChat, addSwipe } = Chats.useChat(
        useShallow((state) => ({
            swipeChat: state.swipe,
            addSwipe: state.addSwipe,
        }))
    )

    const { message } = Chats.useChat((state) => ({
        message: state?.data?.messages?.[index] ?? Chats.dummyEntry,
    }))

    const handleSwipeLeft = () => {
        swipeChat(index, -1)
    }

    const handleSwipeRight = async () => {
        const atLimit = await swipeChat(index, 1)
        if (atLimit && !isGreeting) {
            const id = await addSwipe(index)
            if (id) generateResponse(id)
        }
    }

    const isLastAltGreeting = isGreeting && message.swipe_id === message.swipes.length - 1

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
                            ? Style.getColor('primary-text3')
                            : Style.getColor('primary-text1')
                    }
                />
            </TouchableHighlight>

            {index !== 0 && (
                <TouchableHighlight
                    onPress={() => regenerateResponse(message.swipes[message.swipe_id].id)}
                    onLongPress={() =>
                        regenerateResponse(message.swipes[message.swipe_id].id, false)
                    }
                    disabled={nowGenerating}
                    style={styles.swipeButton}>
                    <AntDesign
                        name="retweet"
                        size={20}
                        color={
                            nowGenerating
                                ? Style.getColor('primary-text3')
                                : Style.getColor('primary-text1')
                        }
                    />
                </TouchableHighlight>
            )}

            <Text style={styles.swipeText}>
                {message.swipe_id + 1} / {message.swipes.length}
            </Text>

            {index !== 0 && (
                <TouchableHighlight
                    onPress={() => continueResponse(message.swipes[message.swipe_id].id)}
                    disabled={nowGenerating}
                    style={styles.swipeButton}>
                    <AntDesign
                        name="forward"
                        size={20}
                        color={
                            nowGenerating
                                ? Style.getColor('primary-text3')
                                : Style.getColor('primary-text1')
                        }
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
                    color={
                        isLastAltGreeting || nowGenerating
                            ? Style.getColor('primary-text3')
                            : Style.getColor('primary-text1')
                    }
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
        color: Style.getColor('primary-text2'),
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
