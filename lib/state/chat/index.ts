import * as chatActions from './actions'
import { db } from './db'
import * as generationActions from './generationActions'
import { useBuffer, useChat } from './hooks'
import { useChatState } from './state'

export const Chats = {
    db: db,
    actions: { ...chatActions, ...generationActions },
    useChatState: useChatState,
    useChat: useChat,
    useBuffer: useBuffer,
}

export { useGenerationState } from './generationState'
export type { Chat, ChatMessage, ScrollData, OutputBuffer } from './types'
