export const thinkTags = [
    {
        open: /^<think(?:ing)?\b[^>]*>/,
        close: /^<\/think(?:ing)?>/,
    },
    {
        open: /^<\|channel>thought/,
        close: '<channel|>',
    },
    {
        open: /^<seed:think>/,
        close: '</seed:think>',
    },
    {
        open: /^<thought\b[^>]*>/,
        close: '</thought>',
    },
]

function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildThinkRules() {
    return thinkTags.map((tag) => {
        const openSource =
            tag.open instanceof RegExp ? tag.open.source.replace(/^\^/, '') : escapeRegex(tag.open)

        const closeSource =
            tag.close instanceof RegExp
                ? tag.close.source.replace(/^\^/, '')
                : escapeRegex(tag.close)

        return {
            macro: new RegExp(`${openSource}[\\s\\S]*?${closeSource}`, 'g'),
            value: '',
        }
    })
}
