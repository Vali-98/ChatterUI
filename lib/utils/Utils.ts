import { API } from '../constants/API'
import { Global } from '../constants/GlobalValues'
import { Characters } from '../storage/Characters'
import { mmkv } from '../storage/MMKV'

export const humanizedISO8601DateTime = (date = '') => {
    const baseDate = typeof date === 'number' ? new Date(date) : new Date()
    const humanYear = baseDate.getFullYear()
    const humanMonth = baseDate.getMonth() + 1
    const humanDate = baseDate.getDate()
    const humanHour = (baseDate.getHours() < 10 ? '0' : '') + baseDate.getHours()
    const humanMinute = (baseDate.getMinutes() < 10 ? '0' : '') + baseDate.getMinutes()
    const humanSecond = (baseDate.getSeconds() < 10 ? '0' : '') + baseDate.getSeconds()
    const humanMillisecond =
        (baseDate.getMilliseconds() < 10 ? '0' : '') + baseDate.getMilliseconds()
    const HumanizedDateTime =
        humanYear +
        '-' +
        humanMonth +
        '-' +
        humanDate +
        ' @' +
        humanHour +
        'h ' +
        humanMinute +
        'm ' +
        humanSecond +
        's ' +
        humanMillisecond +
        'ms'
    return HumanizedDateTime
}

type Macro = {
    macro: string
    value: string
}
const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const replaceMacros = (text: string) => {
    if (text === undefined) return ''
    let newtext: string = text
    const charName = Characters.useCharacterCard.getState().card?.name ?? ''
    const userName = Characters.useUserCard.getState().card?.name ?? ''
    const time = new Date()
    const rules: Macro[] = [
        { macro: '{{user}}', value: userName },
        { macro: '{{char}}', value: charName },
        { macro: '{{time}}', value: time.toLocaleTimeString() },
        { macro: '{{date}}', value: time.toLocaleDateString() },
        { macro: '{{weekday}}', value: weekday[time.getDay()] },
    ]
    for (const rule of rules) newtext = newtext.replaceAll(rule.macro, rule.value)
    return newtext
}

const getMMKVObjectModel = (mmkvKey: string, field: string) => {
    const data = mmkv.getString(mmkvKey)
    if (!data) return 'undefined'
    const model = JSON.parse(data)[field]
    return model
}

// TODO: remove this
export const getCurrentModel = () => {
    const api = mmkv.getString(Global.APIType)
    switch (api) {
        case API.CHATCOMPLETIONS: {
            return getMMKVObjectModel(Global.ChatCompletionsModel, 'id')
        }
        case API.CLAUDE: {
            return getMMKVObjectModel(Global.ClaudeModel, 'name')
        }
        // TODO: Finish this - need data for KAI api
    }
}

const day_ms = 86400000
export const getFriendlyTimeStamp = (oldtime: number) => {
    const now = new Date().getTime()
    const delta = now - oldtime
    if (delta < now % day_ms) return new Date(oldtime).toLocaleTimeString()
    if (delta < (now % day_ms) + day_ms) return 'Yesterday'
    return new Date(oldtime).toLocaleDateString()
}
