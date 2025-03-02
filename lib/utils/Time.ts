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

const day_ms = 86400000
export const getFriendlyTimeStamp = (oldtime: number) => {
    const now = Date.now()
    const delta = now - oldtime
    if (delta < now % day_ms) return new Date(oldtime).toLocaleTimeString()
    if (delta < (now % day_ms) + day_ms) return 'Yesterday'
    return new Date(oldtime).toLocaleDateString()
}
