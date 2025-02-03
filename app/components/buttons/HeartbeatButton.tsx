import { Theme } from '@lib/theme/ThemeManager'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import ThemedButton from './ThemedButton'

const enum ResponseStatus {
    DEFAULT,
    OK,
    ERROR,
}

type HeartbeatButtonProps = {
    api: string
    buttonText?: string
    apiFormat?: (url: string) => string
    callback?: () => void
    messageNeutral?: string
    messageError?: string
    messageOK?: string
    headers?: any
}

const HeartbeatButton: React.FC<HeartbeatButtonProps> = ({
    api,
    buttonText = 'Test',
    apiFormat = (url: string) => {
        try {
            const newurl = new URL('v1/models', api)
            return newurl.toString()
        } catch (e) {
            return ''
        }
    },
    messageNeutral = 'Not Connected',
    messageError = 'Failed To Connect',
    messageOK = 'Connected',
    headers = {},
    callback = () => {},
}) => {
    const { color, spacing } = Theme.useTheme()
    const [status, setStatus] = useState<ResponseStatus>(ResponseStatus.DEFAULT)

    useEffect(() => {
        handleCheck()
    }, [])

    const StatusMessage = () => {
        switch (status) {
            case ResponseStatus.DEFAULT:
                return messageNeutral
            case ResponseStatus.ERROR:
                return messageError
            case ResponseStatus.OK:
                return messageOK
        }
    }

    const handleCheck = async () => {
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
        } catch (error) {
            setStatus(ResponseStatus.ERROR)
        }
    }

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
            <ThemedButton label="Test" onPress={handleCheck} variant="secondary" />
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
