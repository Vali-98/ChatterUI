import { View, Text, StyleSheet, TouchableHighlight } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import { Style } from '@globals'
import React from 'react'
import { ChatEntry, Chats } from '@constants/Chat'
import { useShallow } from 'zustand/react/shallow'
import { continueResponse, generateResponse, regenerateResponse } from '@constants/Inference'

type SwipesProps = {
    message: ChatEntry
    nowGenerating: boolean
    index: number
}

const Swipes: React.FC<SwipesProps> = ({ message, nowGenerating, index }) => {
    const { swipeChat, addSwipe } = Chats.useChat(
        useShallow((state) => ({
            swipeChat: state.swipe,
            addSwipe: state.addSwipe,
        }))
    )

    const handleSwipeLeft = () => {
        swipeChat(index, -1)
    }

    const handleSwipeRight = async () => {
        const atLimit = await swipeChat(index, 1)
        if (atLimit && index !== 0) {
            await addSwipe(index)
            generateResponse()
        }
    }

    const isLastAltGreeting = index === 0 && message.swipe_id === message.swipes.length - 1

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
                    onPress={regenerateResponse}
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
                    onPress={continueResponse}
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
