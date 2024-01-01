import { Global } from "./GlobalValues";
import { mmkv } from "./mmkv";

export const humanizedISO8601DateTime = (date = '') => {
    let baseDate = typeof date === 'number' ? new Date(date) : new Date();
    let humanYear = baseDate.getFullYear();
    let humanMonth = (baseDate.getMonth() + 1);
    let humanDate = baseDate.getDate();
    let humanHour = (baseDate.getHours() < 10 ? '0' : '') + baseDate.getHours();
    let humanMinute = (baseDate.getMinutes() < 10 ? '0' : '') + baseDate.getMinutes();
    let humanSecond = (baseDate.getSeconds() < 10 ? '0' : '') + baseDate.getSeconds();
    let humanMillisecond = (baseDate.getMilliseconds() < 10 ? '0' : '') + baseDate.getMilliseconds();
    let HumanizedDateTime = (humanYear + "-" + humanMonth + "-" + humanDate + " @" + humanHour + "h " + humanMinute + "m " + humanSecond + "s " + humanMillisecond + "ms");
    return HumanizedDateTime;
}

type Rule = {
    macro : string,
    value : string,
}

export const replaceMacros = (text : string) => {
    if(text == undefined) return ''
    let newtext : string = text
    const charName = mmkv.getString(Global.CurrentCharacter)
    const userName = mmkv.getString(Global.CurrentUser)
    const rules : Array<Rule> = [{macro: '{{user}}', value: userName ?? ''}, {macro: '{{char}}', value: charName ?? ''}]
    for(const rule of rules) 
        newtext = newtext.replaceAll(rule.macro, rule.value)
    return newtext
}