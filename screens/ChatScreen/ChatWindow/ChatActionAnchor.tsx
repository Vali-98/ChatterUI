import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import type { View } from 'react-native'
import {
    measure,
    useAnimatedRef,
    useFrameCallback,
    useSharedValue,
    type SharedValue,
} from 'react-native-reanimated'

import { observeChatActionSelection } from '@lib/state/components/ChatControls'
import type { ControlBounds } from '@lib/utils/controlPlacement'

type Bounds = ControlBounds & { entryId: number }
type AnchorContext = { message: SharedValue<Bounds>; viewport: SharedValue<Bounds> }
const Context = createContext<AnchorContext | null>(null)
export const ChatActionAnchorProvider = ({ children }: { children: ReactNode }) => {
    const message = useSharedValue<Bounds>({ top: 0, bottom: 0, left: 0, right: 0, entryId: -1 })
    const viewport = useSharedValue<Bounds>({ top: 0, bottom: 0, left: 0, right: 0, entryId: -1 })
    const value = useMemo(() => ({ message, viewport }), [message, viewport])
    return <Context.Provider value={value}>{children}</Context.Provider>
}
export const useChatActionBounds = () => {
    const context = useContext(Context)
    // eslint-disable-next-line i18next/no-literal-string -- Internal provider invariant.
    if (!context) throw new Error('Chat action anchors require a provider')
    return context
}
export const useMessageActionAnchor = (entryId: number) => {
    const ref = useAnimatedRef<View>()
    const { message } = useChatActionBounds()
    const frame = useFrameCallback(() => {
        const bounds = measure(ref)
        if (!bounds || bounds.height <= 0 || bounds.width <= 0) return
        const next = {
            top: Math.round(bounds.pageY),
            bottom: Math.round(bounds.pageY + bounds.height),
            left: Math.round(bounds.pageX),
            right: Math.round(bounds.pageX + bounds.width),
            entryId: entryId,
        }
        const previous = message.value
        if (
            previous.entryId !== entryId ||
            previous.top !== next.top ||
            previous.bottom !== next.bottom ||
            previous.left !== next.left ||
            previous.right !== next.right
        )
            message.set(next)
    }, false)
    useEffect(() => {
        const unsubscribe = observeChatActionSelection(entryId, (selected) =>
            frame.setActive(selected)
        )
        return () => {
            unsubscribe()
            frame.setActive(false)
        }
    }, [frame, entryId])
    useEffect(
        () => () => {
            // Virtualized cells may remount during layout changes. Let the viewport observer allow
            // a short measurement gap before dismissing the selected message.
            message.set((previous) =>
                previous.entryId === entryId ? { ...previous, entryId: -1 } : previous
            )
        },
        [message, entryId]
    )
    return ref
}
