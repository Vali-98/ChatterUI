import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

import ThemedButton from './ThemedButton'

const enum ResponseStatus {
    DEFAULT,
    OK,
    ERROR,
}

type HeartbeatButtonProps = {
    api: string
    apiFormat?: (url: string) => string
    callback?: () => void
    messageNeutral?: string
    messageError?: string
    messageOK?: string
    headers?: any
}

const HeartbeatButton: React.FC<HeartbeatButtonProps> = ({
    api,
    apiFormat = (url: string) => {
        try {
            const newurl = new URL('v1/models', api)
            return newurl.toString()
        } catch {
            return ''
        }
    },
    messageNeutral,
    messageError: propMessageError,
    messageOK: propMessageOK,
    headers = {},
    callback = () => {},
}) => {
    const { color } = Theme.useTheme()
    const { t } = useTranslation()
    const [status, setStatus] = useState<ResponseStatus>(ResponseStatus.DEFAULT)

    const StatusMessage = useCallback(() => {
        switch (status) {
            case ResponseStatus.DEFAULT:
                return messageNeutral ?? t('connections.notConnected')
            case ResponseStatus.ERROR:
                return propMessageError ?? t('connections.failedToConnect')
            case ResponseStatus.OK:
                return propMessageOK ?? t('connections.connected')
        }
    }, [status, messageNeutral, propMessageError, propMessageOK, t])

    const handleCheck = useCallback(async () => {
        const endpoint = apiFormat(api)
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => {
                controller.abort()
            }, 1000)
            const response = await fetch(endpoint, {
                method: 'GET',
                signal: controller.signal,
                headers: headers ?? {},
            }).catch(() => ({ status: 400 }))
            clearTimeout(timeout)
            callback()
            setStatus(response.status === 200 ? ResponseStatus.OK : ResponseStatus.ERROR)
        } catch {
            setStatus(ResponseStatus.ERROR)
        }
    }, [api, apiFormat, callback, headers])

    useEffect(() => {
        handleCheck()
    }, [handleCheck])

    const getButtonColor = () => {
        switch (status) {
            case ResponseStatus.DEFAULT:
                return color.neutral._200
            case ResponseStatus.ERROR:
                return color.error._400
            case ResponseStatus.OK:
                return color.primary._500
        }
    }

    const buttonColor = getButtonColor()

    return (
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <ThemedButton label={t('common.test')} onPress={handleCheck} variant="secondary" />
            <View
                style={{
                    marginLeft: 4,
                    backgroundColor: buttonColor,
                    borderColor:
                        status === ResponseStatus.DEFAULT ? color.neutral._100 : buttonColor,
                    padding: 8,
                    minWidth: 160,
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderRadius: 8,
                }}>
                <Text
                    style={{
                        color: color.text._100,
                    }}>
                    {StatusMessage()}
                </Text>
            </View>
        </View>
    )
}

export default HeartbeatButton
