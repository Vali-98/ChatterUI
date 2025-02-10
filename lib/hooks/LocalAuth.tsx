import { AppSettings } from '@lib/constants/GlobalValues'
import { authenticateAsync, getEnrolledLevelAsync, SecurityLevel } from 'expo-local-authentication'
import { useCallback, useEffect, useState } from 'react'
import { useMMKVBoolean } from 'react-native-mmkv'

const useLocalAuth = () => {
    const [success, setSuccess] = useState(false)
    const [retryCount, setRetryCount] = useState(0)
    const [hasAuth, sethasAuth] = useState(true)
    const [enabled, setEnabled] = useMMKVBoolean(AppSettings.LocallyAuthenticateUser)
    const authorized = !enabled || !hasAuth || success

    const retry = useCallback(() => {
        setRetryCount((item) => item + 1)
    }, [retryCount])

    useEffect(() => {
        if (enabled && !success)
            authenticateAsync({
                promptMessage: 'Authentication Required',
            }).then((result) => {
                setSuccess(result.success)
            })
    }, [retryCount])

    useEffect(() => {
        getEnrolledLevelAsync().then((result) => sethasAuth(result !== SecurityLevel.NONE))
    }, [])

    return { authorized, retry }
}

export default useLocalAuth
