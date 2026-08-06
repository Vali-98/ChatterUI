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

export const isOpenThinkTag = (buffer: string) => {
    return thinkTags.some((tag) => {
        if (tag.open instanceof RegExp) {
            return tag.open.test(buffer)
        }

        return buffer.endsWith(tag.open)
    })
}

export const isCloseThinkTag = (buffer: string) => {
    return thinkTags.some((tag) => buffer.endsWith(tag.close))
}
