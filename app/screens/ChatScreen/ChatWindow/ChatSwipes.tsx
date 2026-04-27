import { AntDesign } from '@expo/vector-icons'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { continueResponse, generateResponse, regenerateResponse } from '@lib/engine/Inference'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { ChatSwipe } from 'db/schema'

type SwipesProps = {
    nowGenerating: boolean
    isGreeting: boolean
    swipe: ChatSwipe
}

const ChatSwipes: React.FC<SwipesProps> = ({ nowGenerating, isGreeting, swipe }) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const { data: swipeIdListData } = useLiveQuery(Chats.db.live.swipeIdList(swipe.entry_id), [])
    const swipeIdList = swipeIdListData.map((item) => item.id)

    const currentIndex = swipeIdList.indexOf(swipe.id)
    if (!swipeIdList || currentIndex === -1) return

    const handleSwipeLeft = () => {
        if (currentIndex <= 0) return
        const newSwipeId = swipeIdList[currentIndex - 1]
        if (newSwipeId) Chats.db.mutate.activateSwipe(newSwipeId)
    }

    const handleSwipeRight = async (message: string) => {
        if (currentIndex >= swipeIdList.length - 1) {
            const newSwipe = await Chats.db.mutate.createSwipe(swipe.entry_id, message)
            if (!newSwipe) return
            if (message) continueResponse(newSwipe)
            else generateResponse(newSwipe.id)
        } else {
            const newSwipeId = swipeIdList[currentIndex + 1]
            if (newSwipeId) Chats.db.mutate.activateSwipe(newSwipeId)
        }
    }

    const isLastAltGreeting = isGreeting && currentIndex === swipeIdList.length
    const isFirstSwipe = currentIndex === 0

    const disahleSwipeRight = nowGenerating || isFirstSwipe

    return (
        <View style={styles.swipesItem}>
            <TouchableOpacity
                style={styles.swipeButton}
                onPress={handleSwipeLeft}
                disabled={disahleSwipeRight}>
                <AntDesign
                    name="left"
                    size={20}
                    color={disahleSwipeRight ? color.text._600 : color.text._300}
                />
            </TouchableOpacity>

            {!isGreeting && (
                <TouchableOpacity
                    onPress={() => regenerateResponse(swipe)}
                    onLongPress={() => regenerateResponse(swipe, false)}
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
                {currentIndex + 1} / {swipeIdList.length}
            </Text>

            {!isGreeting && (
                <TouchableOpacity
                    onPress={() => continueResponse(swipe)}
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
                onLongPress={() => handleSwipeRight(swipe.swipe ?? '')}
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

export default ChatSwipes

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()
    return StyleSheet.create({
        swipesItem: {
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            flex: 1,
            marginTop: spacing.sm,
            zIndex: 32,
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
