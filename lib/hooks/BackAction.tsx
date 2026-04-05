import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { BackHandler } from 'react-native'
/**
 *
 * @param onBackPress returns true if back press is intercepted, false otherwise, should be memoized to avoid resubscribing
 */
export function useBackAction(onBackPress: () => boolean) {
    useFocusEffect(
        useCallback(() => {
            const handler = BackHandler.addEventListener('hardwareBackPress', onBackPress)
            return () => handler.remove()
        }, [onBackPress])
    )
}
