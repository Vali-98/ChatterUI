import { Characters } from './Characters'
import { Global } from './GlobalValues'
import { mmkv } from './mmkv'

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

type Rule = {
    macro: string
    value: string
}

export const replaceMacros = (text: string) => {
    if (text == undefined) return ''
    let newtext: string = text
    const charName = Characters.useCharacterCard.getState().card?.data.name
    const userName = mmkv.getString(Global.CurrentUser)
    const rules: Rule[] = [
        { macro: '{{user}}', value: userName ?? '' },
        { macro: '{{char}}', value: charName ?? '' },
    ]
    for (const rule of rules) newtext = newtext.replaceAll(rule.macro, rule.value)
    return newtext
}
