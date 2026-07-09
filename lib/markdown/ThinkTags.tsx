export const thinkTags = [
    {
        open: /^<think\b[^>]*>/,
        close: '</think>',
    },
    {
        open: /^<thinking\b[^>]*>/,
        close: '</thinking>',
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

        const closeSource = escapeRegex(tag.close)

        return {
            macro: new RegExp(`${openSource}[\\s\\S]*?${closeSource}`, 'g'),
            value: '',
        }
    })
}
