import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
    measure,
    useAnimatedRef,
    useAnimatedStyle,
    useAnimatedReaction,
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
import type { ChatSwipe } from '@db/schema'
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
    const swipe = entry?.swipes.find((item) => item.active)
    return (
        <Animated.View
            ref={ref}
            collapsable={false}
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
            {entryId !== undefined && entry?.id === entryId && swipe && !isGenerating && (
                <PositionedChatActions
                    key={entry.id}
                    entryId={entry.id}
                    swipe={swipe}
                    isGenerating={isGenerating}
                    playerHeight={playerHeight}
                />
            )}
        </Animated.View>
    )
}
// Each selected entry owns its position, including while its old panel exits.
// A new panel remains hidden until its own message anchor has been measured.
const PositionedChatActions = ({
    entryId,
    swipe,
    isGenerating,
    playerHeight,
}: {
    entryId: number
    swipe: ChatSwipe
    isGenerating: boolean
    playerHeight: number
}) => {
    const { message, viewport } = useChatActionBounds()
    const size = useSharedValue({ width: 0, height: 38 })
    const placement = useSharedValue({
        top: 0,
        right: CHAT_CONTROL_EDGE,
        maxWidth: 0,
        visible: false,
    })
    useAnimatedReaction(
        () => ({
            anchor: message.value,
            bounds: viewport.value,
            size: size.value,
            lift: chatControlLift.value,
        }),
        ({ anchor, bounds, size, lift }) => {
            if (anchor.entryId !== entryId) return
            placement.set({
                ...placeChatControl(
                    anchor,
                    bounds,
                    size,
                    playerHeight > 0 ? playerHeight + CHAT_CONTROL_GAP + lift : 0
                ),
                maxWidth: Math.max(0, bounds.right - bounds.left - CHAT_CONTROL_EDGE * 2),
            })
        }
    )
    const position = useAnimatedStyle(() => ({
        top: placement.value.top,
        right: placement.value.right,
        maxWidth: placement.value.maxWidth,
    }))
    const visibility = useAnimatedStyle(() => ({ opacity: placement.value.visible ? 1 : 0 }))
    return (
        <Animated.View
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
                <ChatQuickActions entryId={entryId} swipe={swipe} isGenerating={isGenerating} />
            </Animated.View>
        </Animated.View>
    )
}
export default ChatActionOverlay
