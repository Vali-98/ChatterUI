import { AntDesign } from '@expo/vector-icons'
import { continueResponse, generateResponse, regenerateResponse } from '@lib/engine/Inference'
import { Chats } from '@lib/state/Chat'
import { Style } from '@lib/utils/Global'
import React from 'react'
import { StyleSheet, Text, TouchableHighlight, View } from 'react-native'

type SwipesProps = {
    nowGenerating: boolean
    isGreeting: boolean
    index: number
}

const Swipes: React.FC<SwipesProps> = ({ nowGenerating, isGreeting, index }) => {
    const { swipeChat, addSwipe } = Chats.useSwipes()
    const { swipeText, swipeId, swipeIndex, swipesLength } = Chats.useSwipeData(index)

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

    const isLastAltGreeting = isGreeting && swipeIndex === swipesLength - 1

    return (
        <View style={styles.swipesItem}>
            <TouchableHighlight
                style={styles.swipeButton}
                onPress={handleSwipeLeft}
                disabled={nowGenerating || swipeIndex === 0}>
                <AntDesign
                    name="left"
                    size={20}
                    color={
                        swipeIndex === 0 || nowGenerating
                            ? Style.getColor('primary-text3')
                            : Style.getColor('primary-text1')
                    }
                />
            </TouchableHighlight>

            {index !== 0 && (
                <TouchableHighlight
                    onPress={() => swipeId && regenerateResponse(swipeId)}
                    onLongPress={() => swipeId && regenerateResponse(swipeId, false)}
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
                {swipeIndex + 1} / {swipesLength}
            </Text>

            {index !== 0 && (
                <TouchableHighlight
                    onPress={() => swipeId && continueResponse(swipeId)}
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
                onLongPress={() => handleSwipeRight(swipeText ?? '')}
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
        paddingVertical: 6,
        paddingHorizontal: 8,
    },

    swipeButton: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 4,
    },
})
