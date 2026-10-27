import { t } from 'i18next'

import { AppSettings } from '@lib/constants/GlobalValues'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { Characters } from '@lib/state/characters'
import { Logger } from '@lib/state/Logger'
import { getActiveMacros, replaceMacros } from '@lib/state/Macros'
import { mmkv } from '@lib/storage/MMKV'
import { saveStringToDownload } from '@lib/utils/File'
import type { MacroValues } from '@lib/utils/Macros'
import { convertToFormatInstruct } from '@lib/utils/TextFormat'

import { assertChatEditable, type ChatMutationOptions } from './access'
import { copyAttachment, deleteAttachmentFiles, prepareAttachment } from './attachments'
import { db } from './db'
import { chatImportSchema } from './schema'
import { useChatState } from './state'
import type {
    AttachmentInput,
    EditMessageInput,
    ChatInput,
    ChatMessage,
    CreateMessageInput,
    CreateTurnInput,
    UpdateSwipeOptions,
} from './types'

export const countMessageTokens = async (
    message: ChatMessage,
    tokenize: (text: string, imageUris?: string[]) => Promise<number>
) => {
    if (message.id === -1) return 0
    const swipe = message.swipes.find((item) => item.active)
    if (!swipe) return 0
    // Stored counts have no tokenizer/model identity, so recalculate for each prompt.
    const count = await tokenize(
        swipe.swipe,
        message.attachments
            .filter((attachment) => attachment.type === 'image')
            .map((attachment) => attachment.uri)
    )
    if (swipe.token_length !== count) db.update.swipe(swipe.id, { token_length: count })
    return count
}

export const loadChat = async (chatId: number) => {
    const chat = db.query.chatMetadata(chatId)
    if (!chat) {
        Logger.errorToast(t('chat.state.failedToLoad', { id: chatId }))
        return false
    }
    if (chat.user_id !== null && mmkv.getBoolean(AppSettings.AutoLoadUser)) {
        const user = Characters.useUserStore.getState()
        if (user.id !== chat.user_id) {
            const name = await user.setCard(chat.user_id)
            if (name) Logger.infoToast(t('users.messages.loadingUser', { name }))
            else Logger.warn(`Failed to load user card ${chat.user_id}; it may have been deleted.`)
        }
    }
    useChatState.getState().setChat(chatId, {
        cause: 'saveScroll',
        index: Math.max(
            0,
            Math.min(chat.scroll_offset ?? chat.messageCount, chat.messageCount - 1)
        ),
    })
    return true
}

export const createChat = async (characterId: number) => {
    const card = await Characters.db.query.card(characterId)
    if (!card) return undefined
    const greetings = mmkv.getBoolean(AppSettings.CreateFirstMes)
        ? [card.first_mes, ...card.alternate_greetings.map((greeting) => greeting.greeting)].filter(
              Boolean
          )
        : []
    const macros = { ...getActiveMacros({ temporal: false }), char: card.name }
    return db.create.chat({
        character_id: characterId,
        user_id: Characters.useUserStore.getState().id,
        messages: greetings.length
            ? [
                  {
                      name: card.name,
                      is_user: false,
                      swipes: greetings.map((greeting, index) => ({
                          swipe: convertToFormatInstruct(replaceMacros(greeting, macros)),
                          active: index === 0,
                      })),
                  },
              ]
            : [],
    })
}

export const createMessage = async (chatId: number, input: CreateMessageInput) => {
    assertChatEditable(chatId)
    const text = replaceMacros(input.text, getActiveMacros({ temporal: false }))
    const attachments: AttachmentInput[] = []
    try {
        for (const uri of input.attachmentUris ?? []) attachments.push(await prepareAttachment(uri))
        return db.create.message(chatId, {
            name: input.name,
            is_user: input.is_user,
            swipes: [
                {
                    swipe: text,
                    active: true,
                },
            ],
            attachments: attachments,
        })
    } catch (error) {
        deleteAttachmentFiles(attachments)
        throw error
    }
}

export const createTurn = async (
    chatId: number,
    input: CreateTurnInput,
    options: ChatMutationOptions & { signal: AbortSignal; macros: MacroValues }
) => {
    const attachments: AttachmentInput[] = []
    const checkAccess = () => {
        if (options.signal.aborted) throw new Error('Submission cancelled')
        assertChatEditable(chatId, options)
    }
    try {
        checkAccess()
        for (const uri of input.attachmentUris ?? []) {
            attachments.push(await prepareAttachment(uri))
            checkAccess()
        }
        checkAccess()
        return db.create.turn(
            chatId,
            {
                user:
                    input.text.trim() || attachments.length
                        ? {
                              name: input.userName,
                              is_user: true,
                              swipes: [
                                  {
                                      swipe: replaceMacros(input.text, {
                                          char: options.macros.char,
                                          user: options.macros.user,
                                      }),
                                      active: true,
                                  },
                              ],
                              attachments: attachments,
                          }
                        : undefined,
                assistant: {
                    name: input.characterName,
                    is_user: false,
                    swipes: [{ swipe: '', active: true }],
                },
            },
            { mutationToken: options.mutationToken }
        )
    } catch (error) {
        deleteAttachmentFiles(attachments)
        throw error
    }
}

export const createSwipe = (
    messageId: number,
    text: string,
    options: { sourceSwipeId?: number } = {}
) =>
    db.create.swipe(messageId, {
        swipe: replaceMacros(text, getActiveMacros({ temporal: false })),
        reasoning:
            options.sourceSwipeId !== undefined
                ? db.query.reasoning(options.sourceSwipeId)
                : undefined,
    })

export const updateSwipe = async (
    swipeId: number,
    text: string,
    options: UpdateSwipeOptions = {}
) => {
    const swipe = db.query.swipe(swipeId)
    if (!swipe) return undefined
    const context = db.query.swipeContext(swipeId)
    if (context) assertChatEditable(context.chat_id, options)
    const imageUris = db.query
        .messageAttachments(swipe.entry_id)
        .filter((attachment) => attachment.type === 'image')
        .map((attachment) => attachment.uri)
    const fields: Parameters<typeof db.update.swipe>[1] = {
        swipe: text,
        ...(options.reasoning !== undefined && { reasoning: options.reasoning }),
        ...(options.resetReasoningLength !== undefined && {
            resetReasoningLength: options.resetReasoningLength,
        }),
        token_length: await (options.tokenizer ?? Tokenizer.getTokenizer())(text, imageUris).catch(
            () => null
        ),
    }
    const now = new Date()
    if (options.startedAt) fields.gen_started = options.startedAt
    if (options.resetLength !== undefined) fields.reset_length = options.resetLength
    if (options.updateStarted) fields.gen_started = now
    if (options.updateFinished) fields.gen_finished = now
    if (options.resetTimings) fields.timings = null
    if (options.timings) fields.timings = options.timings
    return options.mutationToken === undefined
        ? db.update.swipe(swipeId, fields)
        : db.update.swipe(swipeId, fields, { mutationToken: options.mutationToken })
}

// An edited message is the new baseline; normal regenerate replaces only output after it.
export const editSwipe = (swipeId: number, input: { text: string; reasoning: string }) =>
    updateSwipe(swipeId, input.text, {
        reasoning: input.reasoning,
        resetLength: input.text.length,
        resetReasoningLength: input.reasoning.length,
    })

export const editMessage = async (messageId: number, input: EditMessageInput) => {
    const context = db.query.swipeContext(input.swipeId)
    if (!context) throw new Error('The message no longer exists')
    assertChatEditable(context.chat_id)
    const attachments: AttachmentInput[] = []
    let removed: ReturnType<typeof db.update.message>
    try {
        for (const uri of input.attachmentUris) attachments.push(await prepareAttachment(uri))
        removed = db.update.message(messageId, { ...input, attachments })
    } catch (error) {
        deleteAttachmentFiles(attachments)
        throw error
    }
    deleteAttachmentFiles(removed)
}

export const deleteChat = (chatId: number) => {
    const attachments = db.query.chatAttachments(chatId)
    db.delete.chat(chatId)
    deleteAttachmentFiles(attachments)
    if (useChatState.getState().id === chatId) useChatState.getState().reset()
}

export const deleteMessage = (messageId: number) => {
    const attachments = db.query.messageAttachments(messageId)
    db.delete.message(messageId)
    deleteAttachmentFiles(attachments)
}

export const duplicateChat = async (
    chatId: number,
    options: { throughMessageId?: number } = {}
) => {
    const source = db.query.chatCopy(chatId, options)
    if (!source) return undefined
    const copiedAttachments: AttachmentInput[] = []
    try {
        const messages: NonNullable<ChatInput['messages']> = []
        for (const message of source.messages) {
            const attachments: AttachmentInput[] = []
            for (const attachment of message.attachments) {
                const { id: _id, chat_entry_id: _messageId, ...fields } = attachment
                const copy = await copyAttachment(fields)
                copiedAttachments.push(copy)
                attachments.push(copy)
            }
            messages.push({
                name: message.name,
                is_user: message.is_user,
                swipes: message.swipes.map(
                    ({ id: _id, entry_id: _messageId, ...fields }) => fields
                ),
                attachments: attachments,
            })
        }
        return db.create.chat({
            name: source.name,
            character_id: source.character_id,
            user_id: source.user_id,
            create_date: source.create_date,
            last_modified: Date.now(),
            scroll_offset: source.scroll_offset,
            messages: messages,
        })
    } catch (error) {
        deleteAttachmentFiles(copiedAttachments)
        throw error
    }
}

export const importChat = async (characterId: number, input: unknown) => {
    const source = chatImportSchema.parse(input)
    const userExists = source.user_id !== null && (await Characters.db.query.card(source.user_id))
    return db.create.chat({
        name: source.name,
        character_id: characterId,
        user_id: userExists ? source.user_id : null,
        create_date: source.create_date,
        last_modified: Date.now(),
        scroll_offset: 0,
        messages: source.messages.map((message) => ({
            name: message.name,
            is_user: message.is_user,
            swipes: message.swipes.map(({ id: _id, entry_id: _messageId, ...fields }) => fields),
            // Exported paths refer to another installation's files; imports have no bundled assets.
            attachments: [],
        })),
    })
}

export const exportChat = async (chatId: number) => {
    const chat = db.query.chatCopy(chatId)
    if (!chat) return undefined
    const card = await Characters.db.query.cardRow(chat.character_id)
    const name = `Chatlogs-${card?.name ?? ''}-${chatId}.json`.replaceAll(' ', '_')
    await saveStringToDownload(JSON.stringify(chat), name, 'utf8')
    return name
}
