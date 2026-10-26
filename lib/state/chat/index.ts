import * as chatActions from './actions'
import { db } from './db'
import { useChat } from './hooks'
import { useChatState } from './state'

export const Chats = {
    db: db,
    actions: chatActions,
    useChatState: useChatState,
    useChat: useChat,
}

export type { Chat, ChatMessage, ScrollData } from './types'
