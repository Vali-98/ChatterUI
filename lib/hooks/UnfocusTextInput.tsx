import { useEffect, useRef } from 'react'
import { Keyboard, TextInput } from 'react-native'

export const useUnfocusTextInput = (enabled = true) => {
    const ref = useRef<TextInput>(null)
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
