export const thinkTags = [
    {
        prefix: '<think',
        open: /^<think\b[^>]*>/,
        close: '</think>',
    },
    {
        prefix: '<thinking',
        open: /^<thinking\b[^>]*>/,
        close: '</thinking>',
    },
    {
        prefix: '<|channel>thought',
        open: /^<\|channel>thought/,
        close: '<channel|>',
    },
    {
        prefix: '<seed:think>',
        open: /^<seed:think>/,
        close: '</seed:think>',
    },
    {
        prefix: '<thought',
        open: /^<thought\b[^>]*>/,
        close: '</thought>',
    },
]
