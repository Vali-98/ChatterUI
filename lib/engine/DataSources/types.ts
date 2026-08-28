import { ContextBuilderParams, ContextMessage } from '../API/ContextBuilder'

export type DataSourceResult = {
    content: string
    source: string // for debugging
    tokenLength: number
    position:
        | {
              type: 'relative'
              location: 'afterLast' | 'beforeLast' | 'afterSystem'
          }
        | {
              type: 'index'
              location: number // if greater than context length, simply insert at start of conversation
          }
}

export type DataSource = {
    retrieve: (
        params: ContextBuilderParams,
        messages: ContextMessage[],
        maxLength: number,
        currentLength: number,
        tokenBudget: number,
        lastMessageReached: boolean
    ) => Promise<DataSourceResult[]>
    tokenBudget: number // if 0, opportunistic, otherwise reserve context for addition, passed into retrieve()
    priority: number // 0 = highest
    name: string // for debugging
}
