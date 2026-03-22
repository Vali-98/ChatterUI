import { registerBuiltinTool } from '../ToolExecutor'
import { OpenAIToolDefinition } from '../ToolTypes'

// Built-in tool definitions in OpenAI format
export const BUILTIN_TOOL_DEFINITIONS: OpenAIToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'get_current_datetime',
            description: 'Get the current date and time in ISO format',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'calculate',
            description:
                'Evaluate a mathematical expression. Supports basic arithmetic: +, -, *, /, parentheses, and ** for exponentiation.',
            parameters: {
                type: 'object',
                properties: {
                    expression: {
                        type: 'string',
                        description:
                            'The mathematical expression to evaluate, e.g. "2 + 3 * 4" or "(10 - 2) / 4"',
                    },
                },
                required: ['expression'],
            },
        },
    },
]

// Safe math expression evaluator (no eval)
function safeCalculate(expression: string): number {
    const tokens = tokenize(expression)
    const result = parseExpression(tokens, { pos: 0 })
    if (tokens.length > 0) throw new Error('Unexpected token: ' + tokens[0])
    return result
}

type TokenRef = { pos: number }

function tokenize(expr: string): string[] {
    const tokens: string[] = []
    let i = 0
    while (i < expr.length) {
        if (/\s/.test(expr[i])) {
            i++
            continue
        }
        if ('+-*/()'.includes(expr[i])) {
            // Check for ** operator
            if (expr[i] === '*' && expr[i + 1] === '*') {
                tokens.push('**')
                i += 2
            } else {
                tokens.push(expr[i])
                i++
            }
            continue
        }
        if (/[0-9.]/.test(expr[i])) {
            let num = ''
            while (i < expr.length && /[0-9.]/.test(expr[i])) {
                num += expr[i]
                i++
            }
            tokens.push(num)
            continue
        }
        throw new Error('Invalid character: ' + expr[i])
    }
    return tokens
}

function parseExpression(tokens: string[], ref: TokenRef): number {
    let left = parseTerm(tokens, ref)
    while (tokens[0] === '+' || tokens[0] === '-') {
        const op = tokens.shift()!
        const right = parseTerm(tokens, ref)
        left = op === '+' ? left + right : left - right
    }
    return left
}

function parseTerm(tokens: string[], ref: TokenRef): number {
    let left = parsePower(tokens, ref)
    while (tokens[0] === '*' || tokens[0] === '/') {
        const op = tokens.shift()!
        const right = parsePower(tokens, ref)
        left = op === '*' ? left * right : left / right
    }
    return left
}

function parsePower(tokens: string[], ref: TokenRef): number {
    let base = parseUnary(tokens, ref)
    while (tokens[0] === '**') {
        tokens.shift()
        const exp = parseUnary(tokens, ref)
        base = Math.pow(base, exp)
    }
    return base
}

function parseUnary(tokens: string[], ref: TokenRef): number {
    if (tokens[0] === '-') {
        tokens.shift()
        return -parsePrimary(tokens, ref)
    }
    if (tokens[0] === '+') {
        tokens.shift()
    }
    return parsePrimary(tokens, ref)
}

function parsePrimary(tokens: string[], ref: TokenRef): number {
    const first = tokens[0]
    if (first === '(') {
        tokens.shift() // consume '('
        const result = parseExpression(tokens, ref)
        if (tokens[0] !== ')') throw new Error('Expected )')
        tokens.shift() // consume ')'
        return result
    }
    const token = tokens.shift()
    if (token === undefined) throw new Error('Unexpected end of expression')
    const num = parseFloat(token)
    if (isNaN(num)) throw new Error('Expected number, got: ' + token)
    return num
}

// Register built-in tools
export function registerBuiltinTools(): void {
    registerBuiltinTool('get_current_datetime', async () => {
        return new Date().toISOString()
    })

    registerBuiltinTool('calculate', async (args) => {
        const { expression } = args
        if (typeof expression !== 'string') {
            throw new Error('expression must be a string')
        }
        const result = safeCalculate(expression)
        return String(result)
    })
}
