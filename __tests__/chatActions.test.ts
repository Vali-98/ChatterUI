import { randomUUID } from 'expo-crypto'

import { Tokenizer } from '../lib/engine/Tokenizer'
import { Characters } from '../lib/state/characters'
import { buildBlankCharacterCard } from '../lib/state/characters/schema'
import type { CharacterCard } from '../lib/state/characters/types'
import {
    countMessageTokens,
    createChat,
    createMessage,
    deleteChat,
    deleteMessage,
    duplicateChat,
    exportChat,
    importChat,
    loadChat,
    updateSwipe,
} from '../lib/state/chat/actions'
import { db } from '../lib/state/chat/db'
import { abortGeneration, finishGeneration } from '../lib/state/chat/generationActions'
import { useGenerationState } from '../lib/state/chat/generationState'
import { notifyGenerationComplete } from '../lib/state/chat/notifications'
import { useChatState } from '../lib/state/chat/state'
import type { Chat } from '../lib/state/chat/types'
import { Logger } from '../lib/state/Logger'
import { mmkv } from '../lib/storage/MMKV'
import { copyFile, deleteFile, fileInfo, saveStringToDownload } from '../lib/utils/File'

jest.mock('mime/lite', () => ({
    __esModule: true,
    default: {
        getType: (name: string) =>
            name.endsWith('.png') ? 'image/png' : name.endsWith('.mp3') ? 'audio/mpeg' : null,
    },
}))
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../lib/engine/Tokenizer', () => ({ Tokenizer: { getTokenizer: jest.fn() } }))
jest.mock('../lib/state/characters', () => ({
    Characters: {
        db: { query: { card: jest.fn(), cardRow: jest.fn() } },
        useUserStore: { getState: jest.fn() },
    },
}))
jest.mock('../lib/state/Logger', () => ({
    Logger: {
        info: jest.fn(),
        infoToast: jest.fn(),
        warn: jest.fn(),
        errorToast: jest.fn(),
    },
}))
jest.mock('../lib/state/Macros', () => ({
    getActiveMacros: () => ({ char: 'Selected elsewhere', user: 'User' }),
    replaceMacros: jest.requireActual('../lib/utils/Macros').applyMacros,
}))
jest.mock('../lib/utils/TextFormat', () => ({ convertToFormatInstruct: (text: string) => text }))
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: jest.fn() } }))
jest.mock('../lib/utils/File', () => ({
    AppDirectory: { Attachments: '/attachments/' },
    copyFile: jest.fn(),
    deleteFile: jest.fn(),
    fileInfo: jest.fn(),
    saveStringToDownload: jest.fn(),
}))
jest.mock('../lib/state/chat/notifications', () => ({ notifyGenerationComplete: jest.fn() }))
jest.mock('../lib/state/chat/db', () => ({
    db: {
        query: {
            chatMetadata: jest.fn(),
            chatCopy: jest.fn(),
            swipe: jest.fn(),
            swipeContext: jest.fn(),
            chatAttachments: jest.fn(),
            messageAttachments: jest.fn(),
        },
        create: { chat: jest.fn(), message: jest.fn(), swipe: jest.fn() },
        update: { swipe: jest.fn() },
        delete: { chat: jest.fn(), message: jest.fn() },
    },
}))

const createSource = (): Chat => ({
    id: 10,
    character_id: 1,
    user_id: 2,
    name: 'Original',
    create_date: new Date(100000),
    last_modified: 200000,
    scroll_offset: 0,
    messages: [
        {
            id: 20,
            chat_id: 10,
            name: 'Character',
            is_user: false,
            order: 0,
            swipe_id: 0,
            swipes: [false, true].map((active, index) => ({
                id: 30 + index,
                entry_id: 20,
                active: active,
                swipe: active ? 'chosen' : 'inactive',
                send_date: new Date(100000),
                gen_started: new Date(100000),
                gen_finished: new Date(100000),
                token_length: null,
                reset_length: null,
                timings: null,
            })),
            attachments: [
                {
                    id: 40,
                    chat_entry_id: 20,
                    uri: '/original/image.png',
                    name: 'image.png',
                    type: 'image',
                    mime_type: 'image/png',
                    size: 12,
                },
            ],
        },
    ],
})

const tokenizer = jest.fn<Promise<number>, [string, string[]?]>()
const userSelection = {
    id: 2,
    card: undefined,
    error: undefined,
    setCard: jest.fn<Promise<string | undefined>, [number]>(),
    unloadCard: jest.fn(),
    getImageUri: jest.fn(),
}
let source: Chat
let frames: FrameRequestCallback[]
let frameSpy: jest.SpyInstance

beforeEach(() => {
    jest.resetAllMocks()
    source = createSource()
    frames = []
    frameSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback)
        return frames.length
    })
    let nextFileId = 0
    jest.mocked(randomUUID).mockImplementation(() => `attachment-${++nextFileId}`)
    jest.mocked(copyFile).mockResolvedValue(true)
    jest.mocked(deleteFile).mockReturnValue(true)
    jest.mocked(fileInfo).mockReturnValue({ exists: true, size: 12 } as ReturnType<typeof fileInfo>)
    jest.mocked(mmkv.getBoolean).mockReturnValue(true)
    tokenizer.mockResolvedValue(7)
    jest.mocked(Tokenizer.getTokenizer).mockReturnValue(tokenizer)
    jest.mocked(db.query.chatCopy).mockReturnValue(source)
    jest.mocked(db.query.swipe).mockReturnValue(source.messages[0].swipes[1])
    jest.mocked(db.query.messageAttachments).mockReturnValue(source.messages[0].attachments)
    jest.mocked(db.query.chatAttachments).mockReturnValue(source.messages[0].attachments)
    jest.mocked(db.create.chat).mockReturnValue(99)
    jest.mocked(db.create.message).mockReturnValue(source.messages[0])
    userSelection.id = 2
    userSelection.setCard.mockResolvedValue('User')
    jest.mocked(Characters.useUserStore.getState).mockReturnValue(userSelection)
    useChatState.getState().reset()
    useChatState.getState().setBuffer({ data: '' })
    useGenerationState.getState().reset()
})

afterEach(() => frameSpy.mockRestore())

test('duplicating preserves variants and metadata without mutating the source, and copies attachments', async () => {
    const before = JSON.stringify(source)
    expect(await duplicateChat(source.id)).toBe(99)
    expect(db.query.chatCopy).toHaveBeenCalledWith(10, {})
    expect(copyFile).toHaveBeenCalledWith({
        from: '/original/image.png',
        to: '/attachments/attachment-1.png',
    })
    const input = jest.mocked(db.create.chat).mock.calls[0][0]
    expect(input).toMatchObject({ name: 'Original', character_id: 1, user_id: 2 })
    expect(input.messages![0].swipes.map((swipe) => swipe.active)).toEqual([false, true])
    expect(input.messages![0].attachments![0]).toMatchObject({
        uri: '/attachments/attachment-1.png',
        size: 12,
    })
    expect(input.messages![0].swipes[0]).not.toHaveProperty('id')
    expect(input.messages![0].attachments![0]).not.toHaveProperty('chat_entry_id')
    expect(JSON.stringify(source)).toBe(before)
})

test('forking passes the actual selected message ID to the copy query', async () => {
    await duplicateChat(10, { throughMessageId: 20 })
    expect(db.query.chatCopy).toHaveBeenCalledWith(10, { throughMessageId: 20 })
    jest.mocked(db.query.chatCopy).mockReturnValue(undefined)
    expect(await duplicateChat(10, { throughMessageId: 999 })).toBeUndefined()
    expect(db.create.chat).toHaveBeenCalledTimes(1)
})

test('copy failures clean up staged files and never touch source attachments', async () => {
    source.messages[0].attachments.push({
        ...source.messages[0].attachments[0],
        id: 41,
        uri: '/original/second.png',
    })
    jest.mocked(copyFile).mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    await expect(duplicateChat(10)).rejects.toThrow('Failed to copy')
    expect(db.create.chat).not.toHaveBeenCalled()
    expect(deleteFile).toHaveBeenCalledWith('/attachments/attachment-1.png')
    expect(deleteFile).toHaveBeenCalledWith('/attachments/attachment-2.png')
    expect(deleteFile).not.toHaveBeenCalledWith('/original/image.png')
})

test('database insertion failures clean up successfully copied assets', async () => {
    jest.mocked(db.create.chat).mockImplementation(() => {
        throw new Error('insert failed')
    })
    await expect(duplicateChat(10)).rejects.toThrow('insert failed')
    expect(deleteFile).toHaveBeenCalledWith('/attachments/attachment-1.png')
    expect(deleteFile).not.toHaveBeenCalledWith('/original/image.png')
})

test('message insertion waits for attachment copies and saves the real file size', async () => {
    let finishCopy!: (success: boolean) => void
    jest.mocked(copyFile).mockReturnValueOnce(
        new Promise((resolve) => {
            finishCopy = resolve
        })
    )
    const pending = createMessage(10, {
        name: 'User',
        is_user: true,
        text: '{{char}}',
        attachmentUris: ['/camera/photo.png'],
    })
    expect(db.create.message).not.toHaveBeenCalled()
    finishCopy(true)
    await pending
    expect(db.create.message).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
            swipes: [{ swipe: 'Selected elsewhere', active: true }],
            attachments: [
                expect.objectContaining({ uri: '/attachments/attachment-1.png', size: 12 }),
            ],
        })
    )
})

test('failed message writes clean up prepared files', async () => {
    jest.mocked(db.create.message).mockImplementation(() => {
        throw new Error('write failed')
    })
    await expect(
        createMessage(10, {
            name: 'User',
            is_user: true,
            text: '',
            attachmentUris: ['/camera/photo.png'],
        })
    ).rejects.toThrow('write failed')
    expect(deleteFile).toHaveBeenCalledWith('/attachments/attachment-1.png')
})

test('deletion commits before removing files and leaves files intact if the database fails', () => {
    jest.mocked(db.delete.chat).mockImplementationOnce(() => {
        throw new Error('delete failed')
    })
    expect(() => deleteChat(10)).toThrow('delete failed')
    expect(deleteFile).not.toHaveBeenCalled()
    useChatState.getState().setChat(10)
    deleteChat(10)
    expect(deleteFile).toHaveBeenCalledWith('/original/image.png')
    expect(useChatState.getState().id).toBeUndefined()
    expect(jest.mocked(db.delete.chat).mock.invocationCallOrder[1]).toBeLessThan(
        jest.mocked(deleteFile).mock.invocationCallOrder[0]
    )
})

test('message deletion also keeps files when its database delete fails', () => {
    jest.mocked(db.delete.message).mockImplementationOnce(() => {
        throw new Error('delete failed')
    })
    expect(() => deleteMessage(20)).toThrow('delete failed')
    expect(deleteFile).not.toHaveBeenCalled()
    deleteMessage(20)
    expect(deleteFile).toHaveBeenCalledWith('/original/image.png')
})

test('loading a missing chat preserves the current selection', async () => {
    useChatState.getState().setChat(42)
    expect(await loadChat(999)).toBe(false)
    expect(useChatState.getState().id).toBe(42)
    expect(Logger.errorToast).toHaveBeenCalled()
})

test('loading an empty chat clamps its scroll position to zero and can autoload its user', async () => {
    jest.mocked(db.query.chatMetadata).mockReturnValue({
        id: 10,
        character_id: 1,
        user_id: 3,
        scroll_offset: 500,
        messageCount: 0,
    })
    expect(await loadChat(10)).toBe(true)
    expect(userSelection.setCard).toHaveBeenCalledWith(3)
    expect(useChatState.getState().scrollData).toEqual({ cause: 'saveScroll', index: 0 })
    useChatState.getState().reset()
    expect(useChatState.getState().scrollData).toBeUndefined()
})

test('initial greetings use the target card name and leave temporal macros untouched', async () => {
    const card = {
        ...buildBlankCharacterCard('Character').data,
        id: 1,
        type: 'character',
        image_id: 1,
        background_image: null,
        last_modified: 0,
        tags: [],
        links: [],
        first_mes: '{{char}} greets {user} {{time}}',
        alternate_greetings: [{ id: 3, character_id: 1, greeting: 'Another {{char}}' }],
    } as CharacterCard
    jest.mocked(Characters.db.query.card).mockResolvedValue(card)
    await createChat(1)
    expect(jest.mocked(db.create.chat).mock.calls[0][0].messages![0].swipes).toEqual([
        { swipe: 'Character greets User {{time}}', active: true },
        { swipe: 'Another Character', active: false },
    ])
})

test('import rebuilds ownership, drops external file references, and leaves its input intact', async () => {
    const before = JSON.stringify(source)
    await importChat(9, JSON.parse(before))
    const input = jest.mocked(db.create.chat).mock.calls[0][0]
    expect(input).toMatchObject({ character_id: 9, user_id: null, scroll_offset: 0 })
    expect(input.messages![0].attachments).toEqual([])
    expect(input.messages![0].swipes[1].active).toBe(true)
    expect(input).not.toHaveProperty('id')
    expect(JSON.stringify(source)).toBe(before)
    await expect(importChat(9, {})).rejects.toThrow()
    expect(db.create.chat).toHaveBeenCalledTimes(1)
})

test('tokenization uses the active swipe, returns the computed count, and respects the current tokenizer', async () => {
    const message = source.messages[0]
    expect(await countMessageTokens(message, tokenizer)).toBe(7)
    expect(tokenizer).toHaveBeenCalledWith('chosen', ['/original/image.png'])
    expect(db.update.swipe).toHaveBeenCalledWith(31, { token_length: 7 })
    message.swipes[1].token_length = 7
    const otherTokenizer = jest.fn(async () => 15)
    expect(await countMessageTokens(message, otherTokenizer)).toBe(15)
    tokenizer.mockResolvedValue(0)
    expect(await countMessageTokens(message, tokenizer)).toBe(0)
})

test('identical token metadata and synthetic messages avoid unnecessary writes', async () => {
    source.messages[0].swipes[1].token_length = 7
    expect(await countMessageTokens(source.messages[0], tokenizer)).toBe(7)
    expect(db.update.swipe).not.toHaveBeenCalled()
    expect(await countMessageTokens({ ...source.messages[0], id: -1 }, tokenizer)).toBe(0)
    expect(tokenizer).toHaveBeenCalledTimes(1)
})

test('swipe edits include image token costs and use null for a failed token calculation', async () => {
    await updateSwipe(31, 'edited', { resetTimings: true, updateFinished: true })
    expect(tokenizer).toHaveBeenCalledWith('edited', ['/original/image.png'])
    expect(db.update.swipe).toHaveBeenCalledWith(
        31,
        expect.objectContaining({
            swipe: 'edited',
            token_length: 7,
            timings: null,
            gen_finished: expect.any(Date),
        })
    )
    tokenizer.mockRejectedValueOnce(new Error('tokenizer unavailable'))
    await updateSwipe(31, 'edited')
    expect(db.update.swipe).toHaveBeenLastCalledWith(
        31,
        expect.objectContaining({ token_length: null })
    )
})

test('generation finalization saves its captured swipe and notifies for its actual chat', async () => {
    useGenerationState.getState().startGenerating(31)
    useChatState.getState().setChat(999)
    useChatState.getState().setBuffer({ data: 'response' })
    jest.mocked(db.query.swipeContext).mockReturnValue({
        chat_id: 10,
        character_id: 1,
        character_name: 'Character',
    })
    await finishGeneration()
    expect(db.update.swipe).toHaveBeenCalledWith(31, expect.objectContaining({ swipe: 'response' }))
    expect(notifyGenerationComplete).toHaveBeenCalledWith({
        chatId: 10,
        characterId: 1,
        characterName: 'Character',
        text: 'response',
    })
    frames[0](0)
    expect(useGenerationState.getState().isGenerating).toBe(false)
    expect(useChatState.getState().buffer.data).toBe('')
})

test('an old completion frame cannot clear a newer generation', async () => {
    useGenerationState.getState().startGenerating(31)
    await finishGeneration()
    useGenerationState.getState().startGenerating(100)
    useChatState.getState().setBuffer({ data: 'new response' })
    frames[0](0)
    expect(useGenerationState.getState().currentSwipeId).toBe(100)
    expect(useChatState.getState().buffer.data).toBe('new response')
})

test('abort uses the registered backend callback and new generations clear stale callbacks', async () => {
    const abort = jest.fn(async () => {})
    useGenerationState.getState().startGenerating(31)
    useGenerationState.getState().setAbort(abort)
    await abortGeneration()
    expect(abort).toHaveBeenCalledTimes(1)
    useGenerationState.getState().startGenerating(100)
    expect(useGenerationState.getState().abortFunction).toBeUndefined()
})

test('export includes every variant so importing can preserve the selected swipe', async () => {
    expect(await exportChat(10)).toBe('Chatlogs--10.json')
    const [serialized] = jest.mocked(saveStringToDownload).mock.calls[0]
    const exported = JSON.parse(serialized)
    expect(exported.messages[0].swipes.map((swipe: { active: boolean }) => swipe.active)).toEqual([
        false,
        true,
    ])
    expect(exported.messages[0].swipes[1].swipe).toBe('chosen')
})
