import type {
    ChatAttachmentType,
    ChatEntryType,
    ChatSwipe,
    ChatType,
    CompletionTimings,
    chatAttachments,
    chatEntries,
    chats,
    chatSwipes,
} from '@db/schema'

import type { ChatMutationOptions } from './access'

export type ChatMessage = ChatEntryType & {
    swipes: ChatSwipe[]
    attachments: ChatAttachmentType[]
}

export type Chat = ChatType & { messages: ChatMessage[] }

export type ScrollData = { cause: 'search' | 'saveScroll'; index: number }

export type UpdateSwipeOptions = ChatMutationOptions & {
    resetReasoningLength?: number | null
    reasoning?: string | null
    startedAt?: Date
    resetLength?: number | null
    tokenizer?: (text: string, imageUris?: string[]) => Promise<number>
    updateFinished?: boolean
    updateStarted?: boolean
    timings?: CompletionTimings
    resetTimings?: boolean
}

export type AttachmentInput = Omit<typeof chatAttachments.$inferInsert, 'id' | 'chat_entry_id'>
export type SwipeInput = Omit<typeof chatSwipes.$inferInsert, 'id' | 'entry_id'> & {
    reasoning?: { content: string; reset_length?: number | null } | null
}
export type MessageInput = Omit<
    typeof chatEntries.$inferInsert,
    'id' | 'chat_id' | 'order' | 'swipe_id'
> & {
    swipes: SwipeInput[]
    attachments?: AttachmentInput[]
}
export type ChatInput = Omit<typeof chats.$inferInsert, 'id'> & { messages?: MessageInput[] }

export type CreateMessageInput = {
    name: string
    is_user: boolean
    text: string
    attachmentUris?: string[]
}

export type CreateTurnInput = {
    userName: string
    characterName: string
    text: string
    attachmentUris?: string[]
}

export type EditMessageInput = {
    swipeId: number
    text: string
    reasoning: string
    retainedAttachmentIds: number[]
    attachmentUris: string[]
}
