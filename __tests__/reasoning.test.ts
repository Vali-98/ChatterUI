import { createReasoningParser, splitReasoning } from '../lib/engine/reasoning/parser'
import { thinkTags } from '../lib/markdown/ThinkTags'
import {
    appendGeneration,
    enableGenerationInlineReasoning,
    createGeneration,
    flushGenerationContent,
    primeGenerationReasoning,
    removeGenerationOutput,
    updateGeneration,
    useGenerationState,
} from '../lib/engine/generation/state'

test.each([
    ['<think>private</think>Answer', 'Answer', 'private'],
    ['Before<thinking detail="yes">private</thinking>After', 'BeforeAfter', 'private'],
    ['<THOUGHT>private</THOUGHT>Answer', 'Answer', 'private'],
    ['<seed:think>private</seed:think>Answer', 'Answer', 'private'],
    ['<|channel>thoughtprivate<channel|>Answer', 'Answer', 'private'],
    ['<think>unfinished', '', 'unfinished'],
    [
        'Visible < 4 and <unknown>literal</unknown>',
        'Visible < 4 and <unknown>literal</unknown>',
        '',
    ],
    ['A<think>one</think>B<think>two</think>C', 'ABC', 'one\n\ntwo'],
])('splits inline output without damaging answer text: %s', (input, text, reasoning) => {
    expect(splitReasoning(input)).toEqual({ text, reasoning })
})

test.each(thinkTags)('reasoning tags survive every stream boundary: $close', (tag) => {
    const examples: Record<string, string> = {
        '</think>': '<think>',
        '</thinking>': '<thinking>',
        '</thought>': '<thought>',
        '</seed:think>': '<seed:think>',
        '<channel|>': '<|channel>thought',
    }
    const input = `Before${examples[tag.close]}Private.\nMore${tag.close}After`
    for (let boundary = 0; boundary <= input.length; boundary++) {
        const parser = createReasoningParser()
        const chunks = [
            parser.push(input.slice(0, boundary)),
            parser.push(input.slice(boundary)),
            parser.finish(),
        ]
        expect(chunks.map((chunk) => chunk.text).join('')).toBe('BeforeAfter')
        expect(chunks.map((chunk) => chunk.reasoning).join('')).toBe('Private.\nMore')
    }
})

test('native and inline output accumulate in separate generation fields, including cancelled fragments', () => {
    const generation = createGeneration({
        chatId: 101,
        swipeId: 101,
        mode: 'remote',
        text: 'Prefix',
    })
    enableGenerationInlineReasoning(generation.id)
    appendGeneration(generation.id, 'Native reasoning', 'reasoning')
    appendGeneration(generation.id, '<thi')
    appendGeneration(generation.id, 'nk>Inline reasoning</think>Answer')
    flushGenerationContent(generation.id)
    expect(useGenerationState.getState().generations[generation.id]).toMatchObject({
        text: 'PrefixAnswer',
        reasoning: 'Native reasoningInline reasoning',
        receivedOutput: true,
    })
    removeGenerationOutput(generation.id)
})

test('forced-open local reasoning and an incomplete closing tag are saved as reasoning', () => {
    const generation = createGeneration({ chatId: 102, swipeId: 102, mode: 'local', text: '' })
    primeGenerationReasoning(generation.id, '</think>')
    expect(useGenerationState.getState().generations[generation.id].receivedOutput).toBe(false)
    appendGeneration(generation.id, 'Partial thought</thi')
    flushGenerationContent(generation.id)
    expect(useGenerationState.getState().generations[generation.id]).toMatchObject({
        text: '',
        reasoning: 'Partial thought</thi',
        receivedOutput: true,
    })
    removeGenerationOutput(generation.id)
})

test('saving seals the output and pending syntax alone does not replace an original swipe', () => {
    const generation = createGeneration({ chatId: 103, swipeId: 103, mode: 'remote', text: '' })
    enableGenerationInlineReasoning(generation.id)
    appendGeneration(generation.id, '<think>')
    expect(useGenerationState.getState().generations[generation.id].receivedOutput).toBe(false)
    appendGeneration(generation.id, 'Private')
    flushGenerationContent(generation.id)
    expect(useGenerationState.getState().generations[generation.id]).toMatchObject({
        text: '',
        reasoning: 'Private',
        receivedOutput: true,
    })
    updateGeneration(generation.id, { status: 'saving' })
    appendGeneration(generation.id, 'Late callback', 'reasoning')
    expect(useGenerationState.getState().generations[generation.id].reasoning).toBe('Private')
    removeGenerationOutput(generation.id)
})

test.each([
    'Example:\n```xml\n<think>sample</think>\n```',
    'Use `<think>sample</think>` literally.',
    'Use ``a `tick` <think>sample</think>`` literally.',
    'Example:\n~~~xml\n<think>sample</think>\n~~~',
    '````xml\n```\n<think>sample</think>\n````',
    '    <think>sample</think> and <think>another</think>\nAnswer',
    '```xml\n```not a closing fence\n<think>sample</think>\n```',
])('code guards preserve literals across every stream boundary: %s', (input) => {
    expect(splitReasoning(input)).toEqual({ text: input, reasoning: '' })
    for (let boundary = 0; boundary <= input.length; boundary++) {
        const parser = createReasoningParser()
        const parts = [
            parser.push(input.slice(0, boundary)),
            parser.push(input.slice(boundary)),
            parser.finish(),
        ]
        expect(parts.map((part) => part.text).join('')).toBe(input)
        expect(parts.map((part) => part.reasoning).join('')).toBe('')
    }
    const parser = createReasoningParser()
    const parts = [...input].map((character) => parser.push(character))
    parts.push(parser.finish())
    expect(parts.map((part) => part.text).join('')).toBe(input)
    expect(parts.map((part) => part.reasoning).join('')).toBe('')
})

test('raw parsing resumes after code, while structured answer text bypasses it entirely', () => {
    expect(splitReasoning('`<think>literal</think>`<think>Real thought</think>Answer')).toEqual({
        text: '`<think>literal</think>`Answer',
        reasoning: 'Real thought',
    })
    const generation = createGeneration({ chatId: 105, swipeId: 105, mode: 'remote', text: '' })
    appendGeneration(generation.id, '<think>Literal native answer text</think>')
    appendGeneration(generation.id, 'Actual native reasoning', 'reasoning')
    expect(useGenerationState.getState().generations[generation.id]).toMatchObject({
        text: '<think>Literal native answer text</think>',
        reasoning: 'Actual native reasoning',
    })
    removeGenerationOutput(generation.id)
})

test('an unmatched backtick in indented code does not hide later reasoning blocks', () => {
    expect(
        splitReasoning('    `<think>Literal</think>\n<think>Real thought</think>Answer')
    ).toEqual({
        text: '    `<think>Literal</think>\nAnswer',
        reasoning: 'Real thought',
    })
})
