import { authenticateAsync, getEnrolledLevelAsync, SecurityLevel } from 'expo-local-authentication'
import { useCallback, useEffect, useState } from 'react'
import { useMMKVBoolean } from 'react-native-mmkv'

import { AppSettings } from '@lib/constants/appSettings'

const useLocalAuth = () => {
    const [success, setSuccess] = useState(false)
    const [retryCount, setRetryCount] = useState(0)
    const [hasAuth, sethasAuth] = useState(true)
    const [enabled] = useMMKVBoolean(AppSettings.LocallyAuthenticateUser)
    const authorized = !enabled || !hasAuth || success

    const retry = useCallback(() => {
        setRetryCount((item) => item + 1)
    }, [])

    useEffect(() => {
        if (enabled && !success)
            authenticateAsync({
                promptMessage: 'Authentication Required',
            }).then((result) => {
                setSuccess(result.success)
            })
    }, [retryCount, enabled, success])

    useEffect(() => {
        getEnrolledLevelAsync().then((result) => sethasAuth(result !== SecurityLevel.NONE))
    }, [])

    return { authorized, retry }
}

export default useLocalAuth
