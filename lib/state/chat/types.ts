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

export type ChatMessage = ChatEntryType & {
    swipes: ChatSwipe[]
    attachments: ChatAttachmentType[]
}

export type Chat = ChatType & { messages: ChatMessage[] }

export type ScrollData = { cause: 'search' | 'saveScroll'; index: number }
export type OutputBuffer = { data: string; timings?: CompletionTimings; error?: string }

export type UpdateSwipeOptions = {
    updateFinished?: boolean
    updateStarted?: boolean
    timings?: CompletionTimings
    resetTimings?: boolean
}

export type AttachmentInput = Omit<typeof chatAttachments.$inferInsert, 'id' | 'chat_entry_id'>
export type SwipeInput = Omit<typeof chatSwipes.$inferInsert, 'id' | 'entry_id'>
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
