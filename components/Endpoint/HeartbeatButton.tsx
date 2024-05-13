import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { Style } from '@globals'

const enum ResponseStatus {
    DEFAULT,
    OK,
    ERROR,
}

type HeartbeatButtonProps = {
    api: string
    buttonText?: string
    messageNeutral?: string
    messageError?: string
    messageOK?: string
}

const HeartbeatButton: React.FC<HeartbeatButtonProps> = ({
    api,
    buttonText = 'Test',
    messageNeutral = 'Not Connected',
    messageError = 'Failed To Connect',
    messageOK = 'Connected',
}) => {
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
        try {
            const url = new URL('/v1/models', api)
            const controller = new AbortController()
            const timeout = setTimeout(() => {
                controller.abort()
            }, 1000)
            const response = await fetch(url, { method: 'GET', signal: controller.signal }).catch(
                () => ({ status: 400 })
            )
            clearTimeout(timeout)
            setStatus(response.status === 200 ? ResponseStatus.OK : ResponseStatus.ERROR)
        } catch (error) {
            setStatus(ResponseStatus.ERROR)
        }
    }

    const getButtonColor = () => {
        switch (status) {
            case ResponseStatus.DEFAULT:
                return Style.getColor('primary-surface1')
            case ResponseStatus.ERROR:
                return Style.getColor('destructive-brand')
            case ResponseStatus.OK:
                return Style.getColor('confirm-brand')
        }
    }

    const buttonColor = getButtonColor()

    return (
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <TouchableOpacity style={styles.button} onPress={handleCheck}>
                <Text style={styles.buttonText}>{buttonText}</Text>
            </TouchableOpacity>
            <View
                style={{
                    marginLeft: 4,
                    backgroundColor: buttonColor,
                    borderColor:
                        status === ResponseStatus.DEFAULT
                            ? Style.getColor('primary-surface2')
                            : buttonColor,
                    padding: 8,
                    minWidth: 160,
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderRadius: 8,
                }}>
                <Text
                    style={{
                        color: Style.getColor('primary-text1'),
                    }}>
                    {StatusMessage()}
                </Text>
            </View>
        </View>
    )
}

export default HeartbeatButton

const styles = StyleSheet.create({
    button: {
        backgroundColor: Style.getColor('primary-surface4'),
        padding: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        margin: 1,
    },

    buttonText: {
        color: Style.getColor('primary-text1'),
    },
})
