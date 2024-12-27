import { AntDesign } from '@expo/vector-icons'
import { Chats } from 'constants/Chat'
import { Style } from 'constants/Global'
import { continueResponse, generateResponse, regenerateResponse } from 'constants/Inference'
import React from 'react'
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native'

type SwipesProps = {
    nowGenerating: boolean
    isGreeting: boolean
    index: number
}

const Swipes: React.FC<SwipesProps> = ({ nowGenerating, isGreeting, index }) => {
    const { swipeChat, addSwipe } = Chats.useSwipes()
    const entry = Chats.useEntryData(index)

    const handleSwipeLeft = () => {
        swipeChat(index, -1)
    }

    const handleSwipeRight = async (message: string) => {
        const atLimit = await swipeChat(index, 1)
        if (atLimit && !isGreeting) {
            const id = await addSwipe(index, message)
            if (!id) return
            if (message) continueResponse(id)
            else generateResponse(id)
        }
    }

    const isLastAltGreeting = isGreeting && entry.swipe_id === entry.swipes.length - 1

    return (
        <View style={styles.swipesItem}>
            <TouchableHighlight
                style={styles.swipeButton}
                onPress={handleSwipeLeft}
                disabled={nowGenerating || entry.swipe_id === 0}>
                <AntDesign
                    name="left"
                    size={20}
                    color={
                        entry.swipe_id === 0 || nowGenerating
                            ? Style.getColor('primary-text3')
                            : Style.getColor('primary-text1')
                    }
                />
            </TouchableHighlight>

            {index !== 0 && (
                <TouchableHighlight
                    onPress={() => regenerateResponse(entry.swipes[entry.swipe_id].id)}
                    onLongPress={() => regenerateResponse(entry.swipes[entry.swipe_id].id, false)}
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
                {entry.swipe_id + 1} / {entry.swipes.length}
            </Text>

            {index !== 0 && (
                <TouchableHighlight
                    onPress={() => continueResponse(entry.swipes[entry.swipe_id].id)}
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
                onPress={() => handleSwipeRight('')}
                onLongPress={() => handleSwipeRight(entry?.swipes?.[entry.swipe_id]?.swipe ?? '')}
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
