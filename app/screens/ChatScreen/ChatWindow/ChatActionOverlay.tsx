import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
    measure,
    useAnimatedRef,
    useAnimatedStyle,
    useFrameCallback,
    useSharedValue,
    runOnJS,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated'

import { CHAT_CONTROL_EDGE, CHAT_CONTROL_GAP } from '@lib/constants/ChatControls'
import { useChatGenerating } from '@lib/engine/generation/hooks'
import { useBackAction } from '@lib/hooks/BackAction'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Chats } from '@lib/state/chat'
import { chatControlLift } from '@lib/state/components/chatControlBounds'
import { useChatActionsState, useChatControlLayoutState } from '@lib/state/components/ChatControls'
import { placeChatControl } from '@lib/utils/controlPlacement'

import { useChatActionBounds } from './ChatActionAnchor'
import ChatQuickActions from './ChatQuickActions'

const ChatActionOverlay = ({ chatId }: { chatId: number }) => {
    const entryId = useChatActionsState((state) => state.activeEntryId)
    const initialEntry = useChatActionsState((state) => state.activeEntry)
    const dismiss = useChatActionsState((state) => state.dismiss)
    useBackAction(
        useCallback(() => {
            if (entryId === undefined) return false
            dismiss(entryId)
            return true
        }, [entryId, dismiss])
    )
    useFocusEffect(useCallback(() => () => dismiss(), [dismiss]))
    const inputHeight = useChatControlLayoutState((state) => state.inputHeight)
    const playerHeight = useChatControlLayoutState((state) => state.playerHeight)
    const isGenerating = useChatGenerating(chatId)
    const { message, viewport } = useChatActionBounds()
    const ref = useAnimatedRef<View>()
    const size = useSharedValue({ width: 0, height: 38 })
    const missingFrames = useSharedValue(0)
    const offscreenFrames = useSharedValue(0)
    const { data: entry } = useLiveQueryAsync(Chats.db.live.message(entryId ?? -1), {
        key: ['selected-message-actions', entryId],
        initialData: initialEntry
            ? {
                  ...initialEntry,
                  swipes: initialEntry.swipes.map((swipe) => ({
                      ...swipe,
                      reasoning: swipe.reasoning ?? null,
                  })),
              }
            : undefined,
        keepPreviousData: false,
        enabled: entryId !== undefined,
        watch: [
            { table: 'chat_entries', rowId: entryId },
            { table: 'chat_swipes' },
            { table: 'swipe_reasoning' },
        ],
    })
    const frame = useFrameCallback(() => {
        const bounds = measure(ref)
        if (!bounds || bounds.height <= 0 || bounds.width <= 0) return
        const next = {
            top: Math.round(bounds.pageY),
            left: Math.round(bounds.pageX),
            bottom: Math.round(bounds.pageY + bounds.height - inputHeight - CHAT_CONTROL_GAP),
            right: Math.round(bounds.pageX + bounds.width),
            entryId: -1,
        }
        const previous = viewport.value
        if (
            previous.top !== next.top ||
            previous.left !== next.left ||
            previous.bottom !== next.bottom ||
            previous.right !== next.right
        )
            viewport.set(next)
        if (message.value.entryId !== entryId) {
            missingFrames.set(missingFrames.value + 1)
            if (missingFrames.value === 15) runOnJS(dismiss)(entryId)
            return
        }
        missingFrames.set(0)
        const anchor = message.value
        const outside = anchor.bottom <= next.top || anchor.top >= next.bottom
        offscreenFrames.set(outside ? offscreenFrames.value + 1 : 0)
        if (offscreenFrames.value === 3) runOnJS(dismiss)(entryId)
    }, false)
    useEffect(() => {
        missingFrames.set(0)
        offscreenFrames.set(0)
        frame.setActive(entryId !== undefined)
        return () => frame.setActive(false)
    }, [frame, entryId, message, missingFrames, offscreenFrames])
    useEffect(() => {
        dismiss()
        return () => dismiss()
    }, [chatId, dismiss])
    useEffect(() => {
        if (isGenerating || (entryId !== undefined && (!entry || entry.chat_id !== chatId)))
            dismiss()
    }, [isGenerating, entryId, entry, chatId, dismiss])
    const position = useAnimatedStyle(() => {
        const anchor = message.value
        const bounds = viewport.value
        const placed = placeChatControl(
            anchor,
            bounds,
            size.value,
            playerHeight > 0 ? playerHeight + CHAT_CONTROL_GAP + chatControlLift.value : 0
        )
        return {
            maxWidth: Math.max(0, bounds.right - bounds.left - CHAT_CONTROL_EDGE * 2),
            top: placed.top,
            right: placed.right,
        }
    })
    const visibility = useAnimatedStyle(() => ({
        opacity: placeChatControl(
            message.value,
            viewport.value,
            size.value,
            playerHeight > 0 ? playerHeight + CHAT_CONTROL_GAP + chatControlLift.value : 0
        ).visible
            ? 1
            : 0,
    }))
    const swipe = entry?.swipes.find((item) => item.active)
    return (
        <Animated.View
            ref={ref}
            collapsable={false}
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
            {entryId !== undefined && entry && swipe && !isGenerating && (
                <Animated.View
                    key={entry.id}
                    collapsable={false}
                    entering={FadeIn.duration(120)}
                    exiting={FadeOut.duration(200)}
                    pointerEvents="box-none"
                    style={[{ position: 'absolute' }, position]}
                    onLayout={(event) => {
                        const { width, height } = event.nativeEvent.layout
                        if (
                            width > 0 &&
                            height > 0 &&
                            (size.value.width !== Math.round(width) ||
                                size.value.height !== Math.round(height))
                        )
                            size.set({ width: Math.round(width), height: Math.round(height) })
                    }}>
                    <Animated.View collapsable={false} pointerEvents="box-none" style={visibility}>
                        <ChatQuickActions
                            entryId={entry.id}
                            swipe={swipe}
                            isGenerating={isGenerating}
                        />
                    </Animated.View>
                </Animated.View>
            )}
        </Animated.View>
    )
}
export default ChatActionOverlay
