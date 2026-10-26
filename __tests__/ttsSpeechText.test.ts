import { createSpeechTextStream } from '../lib/tts/speechText'

test('reasoning tags split at every boundary never leak into speech', () => {
    for (const source of [
        '<think>Hidden. Secret!</think>Answer. ',
        '<thinking>Hidden</thinking>Answer. ',
        '<seed:think>Hidden</seed:think>Answer. ',
        '<|channel>thoughtHidden<channel|>Answer. ',
    ]) {
        const stream = createSpeechTextStream()
        const output: string[] = []
        for (const char of source) output.push(...stream.push(char))
        output.push(...stream.finish())
        expect(output.join(' ')).toBe('Answer.')
    }
})

test('unclosed reasoning is suppressed and the preceding visible text is retained', () => {
    const stream = createSpeechTextStream()
    expect([
        ...stream.push('Visible text <think>secret with punctuation. '),
        ...stream.finish(),
    ]).toEqual(['Visible text'])
})

test('fenced code is skipped across chunks and inline Markdown is cleaned', () => {
    const stream = createSpeechTextStream()
    const output: string[] = []
    for (const chunk of [
        '```py',
        'thon\nprint("secret")\n``',
        '`\n**Hello** [friend](https://example.com). ',
    ])
        output.push(...stream.push(chunk))
    output.push(...stream.finish())
    expect(output).toEqual(['Hello friend.'])
})

test('partial sentences wait and final punctuationless text is flushed', () => {
    const stream = createSpeechTextStream()
    expect(stream.push('Pi is 3.')).toEqual([])
    expect(stream.push('14. Next')).toEqual(['Pi is 3.14.'])
    expect(stream.finish()).toEqual(['Next'])
})

test('long text respects the native chunk limit', () => {
    const stream = createSpeechTextStream(20)
    const chunks = [...stream.push('word '.repeat(30)), ...stream.finish()]
    expect(chunks.every((chunk) => chunk.length <= 20)).toBe(true)
    expect(chunks.join(' ')).toBe('word '.repeat(30).trim())
})
