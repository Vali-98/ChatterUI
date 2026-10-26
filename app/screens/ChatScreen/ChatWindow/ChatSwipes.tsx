import AntDesign from '@react-native-vector-icons/ant-design/static'
import React, { useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { ChatSwipe } from '@db/schema'
import { continueResponse, generateResponse, regenerateResponse } from '@lib/engine/Inference'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Chats, useGenerationState } from '@lib/state/chat'
import { Theme } from '@lib/theme/ThemeManager'

type SwipesProps = {
    isGenerating: boolean
    isGreeting: boolean
    swipe: ChatSwipe
}

const ChatSwipes: React.FC<SwipesProps> = ({ isGenerating, isGreeting, swipe }) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const { data: swipeIdListData } = useLiveQueryAsync(Chats.db.live.swipeIds(swipe.entry_id), {
        key: ['swipe-ids', swipe.entry_id],
        watch: [{ table: 'chat_swipes' }],
    })
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
        if (useGenerationState.getState().isGenerating) return
        if (currentIndex <= 0) return
        const newSwipeId = swipeIdList[currentIndex - 1]
        if (newSwipeId) Chats.db.update.activeSwipe(newSwipeId)
    }

    const handleSwipeRight = (message: string) => {
        if (useGenerationState.getState().isGenerating) return
        if (currentIndex >= swipeIdList.length - 1) {
            const newSwipe = Chats.actions.createSwipe(swipe.entry_id, message)
            if (!newSwipe) return
            if (message) continueResponse(newSwipe)
            else generateResponse(newSwipe.id)
        } else {
            const newSwipeId = swipeIdList[currentIndex + 1]
            if (newSwipeId) Chats.db.update.activeSwipe(newSwipeId)
        }
    }

    const isLastAltGreeting = isGreeting && currentIndex === swipeIdList.length - 1
    const isFirstSwipe = currentIndex === 0

    const disableSwipeLeft = isGenerating || isFirstSwipe
    const disableSwipeRight = isGenerating || isLastAltGreeting

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
                    disabled={isGenerating}
                    style={styles.swipeButton}>
                    <AntDesign name="retweet" size={20} color={getTextColor(isGenerating)} />
                </TouchableOpacity>
            )}

            <Text style={styles.swipeText}>
                {currentIndex + 1} / {swipeIdList.length}
            </Text>

            {!isGreeting && (
                <TouchableOpacity
                    onPress={() => continueResponse(swipe)}
                    disabled={isGenerating}
                    style={styles.swipeButton}>
                    <AntDesign name="forward" size={20} color={getTextColor(isGenerating)} />
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
