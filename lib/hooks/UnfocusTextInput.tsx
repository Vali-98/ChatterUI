import { useEffect, useRef } from 'react'
import { Keyboard, TextInput } from 'react-native'

export const useUnfocusTextInput = () => {
    const ref = useRef<TextInput>(null)
    useEffect(() => {
        const subscription = Keyboard.addListener('keyboardDidHide', () => {
            if (ref.current?.isFocused()) {
                ref.current.blur()
            }
        })
        return () => {
            subscription.remove()
        }
    }, [ref])
    return ref
}
