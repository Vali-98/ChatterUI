import { useInference } from '@constants/Chat'
import { Instructs, InstructType } from '@constants/Instructs'
import { Characters, Chats, Logger } from '@globals'
import EventSource from 'react-native-sse'

import { APIState } from './APIManagerState'
import { defaultTemplates } from './DefaultAPI'
import { buildRequest } from './RequestBuilder'

export const buildAndSendRequest = () => {
    // get values from some global API values state
    // probably store all APIValues and custom configs in a persist zustand store, as they have so few keys
    // and are not prone to changes
    // TODO : Change this to state
    const requestValues = APIState.useAPIState
        .getState()
        .values.find((item, index) => index === APIState.useAPIState.getState().activeIndex)

    if (!requestValues) {
        Logger.log('No API Configuration found', true)
        Chats.useChat.getState().stopGenerating()
        return
    }

    const configs = defaultTemplates.filter((item) => item.name === requestValues.configName)

    const config = configs[0]
    if (!config) {
        Logger.log('API Configuration not found!')
        Chats.useChat.getState().stopGenerating()
        return
    }

    let payload: any = undefined

    payload = buildRequest(config, requestValues)

    if (!payload) {
        Logger.log('Something Went Wrong With Payload Construction', true)
        Chats.useChat.getState().stopGenerating()
        return
    }

    if (typeof payload !== 'string') {
        payload = JSON.stringify(payload)
    }

    let header: any = {}
    if (config.features.useKey) {
        header = {
            [config.request.authHeader]: config.request.authPrefix + requestValues.key,
        }
    }
    readableStreamResponse(
        requestValues.endpoint,
        payload,
        (responseString) => {
            try {
                return getNestedValue(
                    JSON.parse(responseString),
                    config.request.responseParsePattern
                )
            } catch (e) {}
        },
        header
    )
}

type KeyHeader = {
    [key: string]: string
}

const readableStreamResponse = async (
    endpoint: string,
    payload: string,
    jsonreader: (event: any) => string,
    header: KeyHeader = {}
) => {
    const replace = RegExp(
        constructReplaceStrings()
            .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join(`|`),
        'g'
    )

    const es = new EventSource(endpoint, {
        method: 'POST',
        body: payload,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            ...header,
        },
        pollingInterval: 0,
        withCredentials: header?.['X-API-KEY'] !== undefined || header?.Authorization !== undefined,
    })

    const closeStream = () => {
        Logger.debug('Running close stream')
        Chats.useChat.getState().stopGenerating()
        es.removeAllEventListeners()
        es.close()
    }

    useInference.getState().setAbort(async () => {
        Logger.debug('Running abort')
        closeStream()
    })

    es.addEventListener('message', (event) => {
        if (event.data === `[DONE]`) {
            es.close()
            return
        }
        const text = jsonreader(event.data) ?? ''
        const output = Chats.useChat.getState().buffer + text
        Chats.useChat.getState().setBuffer(output.replaceAll(replace, ''))
    })

    es.addEventListener('error', (event) => {
        if ('message' in event) {
            Logger.log('Generation Failed. Check Logs', true)
            Logger.log(`An error occured : ${event?.message ?? ''}`)
        }
        closeStream()
    })
    es.addEventListener('close', (event) => {
        closeStream()
        Logger.log('EventSource closed')
    })
}

const constructReplaceStrings = (): string[] => {
    const currentInstruct: InstructType = Instructs.useInstruct.getState().replacedMacros()
    // default stop strings defined instructs
    const stops: string[] = constructStopSequence()
    // additional stop strings based on context configuration
    const output: string[] = []

    if (currentInstruct.names) {
        const userName = Characters.useCharacterCard.getState().card?.name ?? ''
        const charName: string = Characters.useCharacterCard.getState()?.card?.name ?? ''
        output.push(`${userName} :`)
        output.push(`${charName} :`)
    }
    return [...stops, ...output]
}

const constructStopSequence = (): string[] => {
    const instruct = Instructs.useInstruct.getState().replacedMacros()
    const sequence: string[] = []
    if (instruct.stop_sequence !== '')
        instruct.stop_sequence.split(',').forEach((item) => item !== '' && sequence.push(item))
    return sequence
}

const getNestedValue = (obj: any, path: string) => {
    const keys = path.split('.')
    const value = keys.reduce((acc, key) => acc?.[key], obj)
    return value ?? null
}
