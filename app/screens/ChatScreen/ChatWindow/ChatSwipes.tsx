import { AntDesign } from '@expo/vector-icons'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import React, { useCallback } from 'react'
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

    const getTextColor = useCallback(
        (b: boolean) => {
            return b ? color.text._600 : color.text._300
        },
        [color]
    )

    // return if no list, bad index, or if no alt greetings
    if (!swipeIdList || currentIndex === -1 || (isGreeting && swipeIdList.length === 1)) return

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

    const isLastAltGreeting = isGreeting && currentIndex === swipeIdList.length - 1
    const isFirstSwipe = currentIndex === 0

    const disableSwipeLeft = nowGenerating || isFirstSwipe
    const disableSwipeRight = nowGenerating || isLastAltGreeting

    return (
        <View style={styles.swipesItem}>
            <TouchableOpacity
                style={styles.swipeButton}
                onPress={handleSwipeLeft}
                disabled={disableSwipeLeft}>
                <AntDesign name="left" size={20} color={getTextColor(disableSwipeLeft)} />
            </TouchableOpacity>

            {!isGreeting && (
                <TouchableOpacity
                    onPress={() => regenerateResponse(swipe)}
                    onLongPress={() => regenerateResponse(swipe, false)}
                    disabled={nowGenerating}
                    style={styles.swipeButton}>
                    <AntDesign name="retweet" size={20} color={getTextColor(nowGenerating)} />
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
                    <AntDesign name="forward" size={20} color={getTextColor(nowGenerating)} />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={styles.swipeButton}
                onPress={() => handleSwipeRight('')}
                onLongPress={() => handleSwipeRight(swipe.swipe ?? '')}
                disabled={disableSwipeRight}>
                <AntDesign name="right" size={20} color={getTextColor(disableSwipeRight)} />
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
