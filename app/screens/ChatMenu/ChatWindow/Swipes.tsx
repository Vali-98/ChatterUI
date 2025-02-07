import { AntDesign } from '@expo/vector-icons'
import { continueResponse, generateResponse, regenerateResponse } from '@lib/engine/Inference'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type SwipesProps = {
    nowGenerating: boolean
    isGreeting: boolean
    index: number
}

const Swipes: React.FC<SwipesProps> = ({ nowGenerating, isGreeting, index }) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()

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
            <TouchableOpacity
                style={styles.swipeButton}
                onPress={handleSwipeLeft}
                disabled={nowGenerating || swipeIndex === 0}>
                <AntDesign
                    name="left"
                    size={20}
                    color={swipeIndex === 0 || nowGenerating ? color.text._600 : color.text._300}
                />
            </TouchableOpacity>

            {index !== 0 && (
                <TouchableOpacity
                    onPress={() => swipeId && regenerateResponse(swipeId)}
                    onLongPress={() => swipeId && regenerateResponse(swipeId, false)}
                    disabled={nowGenerating}
                    style={styles.swipeButton}>
                    <AntDesign
                        name="retweet"
                        size={20}
                        color={nowGenerating ? color.text._600 : color.text._300}
                    />
                </TouchableOpacity>
            )}

            <Text style={styles.swipeText}>
                {swipeIndex + 1} / {swipesLength}
            </Text>

            {index !== 0 && (
                <TouchableOpacity
                    onPress={() => swipeId && continueResponse(swipeId)}
                    disabled={nowGenerating}
                    style={styles.swipeButton}>
                    <AntDesign
                        name="forward"
                        size={20}
                        color={nowGenerating ? color.text._600 : color.text._300}
                    />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={styles.swipeButton}
                onPress={() => handleSwipeRight('')}
                onLongPress={() => handleSwipeRight(swipeText ?? '')}
                disabled={nowGenerating || isLastAltGreeting}>
                <AntDesign
                    name="right"
                    size={20}
                    color={isLastAltGreeting || nowGenerating ? color.text._400 : color.text._300}
                />
            </TouchableOpacity>
        </View>
    )
}

export default Swipes

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()
    return StyleSheet.create({
        swipesItem: {
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            flex: 1,
            marginTop: spacing.sm,
        },

        swipeText: {
            color: color.text._200,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.m,
        },

        swipeButton: {
            alignItems: 'center',
            flex: 1,
            paddingVertical: spacing.sm,
        },
    })
}
