import { useEffect, useRef } from 'react'
import { Keyboard, type TextInputInstance } from 'react-native'

export const useUnfocusTextInput = <
    T extends Pick<TextInputInstance, 'isFocused' | 'blur'> = TextInputInstance,
>(
    enabled = true
) => {
    const ref = useRef<T>(null)
    useEffect(() => {
        if (!enabled) return
        const subscription = Keyboard.addListener('keyboardDidHide', () => {
            if (ref.current?.isFocused()) {
                ref.current.blur()
            }
        })
        return () => {
            subscription.remove()
        }
    }, [enabled, ref])
    return ref
}
