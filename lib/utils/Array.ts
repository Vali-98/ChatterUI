export function groupBy(array: any[], key: string) {
    if (array.length === 0) return []
    return array.reduce((result, obj) => {
        const keyValue = obj[key]
        if (!result[keyValue]) {
            result[keyValue] = []
        }
        result[keyValue].push(obj)
        return result
    }, {})
}
