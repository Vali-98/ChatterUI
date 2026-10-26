import { router } from 'expo-router'
import { t } from 'i18next'

import { Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/chat'
import { Logger } from '@lib/state/Logger'

import { appendTTSText, finishTTSSource, startTTSSession } from './player'
import { useTTSState } from './state'

export const speakMessage = (swipeId: number) => {
    const swipe = Chats.db.query.swipe(swipeId)
    const context = Chats.db.query.swipeContext(swipeId)
    if (!swipe || !context) return
    const id = startTTSSession(
        {
            kind: 'manual',
            chatId: context.chat_id,
            messageId: swipe.entry_id,
            swipeId: swipeId,
            name: context.character_name,
        },
        { automatic: false }
    )
    if (id === undefined) return
    appendTTSText(id, swipe.swipe)
    finishTTSSource(id)
}
export const previewSpeech = (text: string) => {
    const id = startTTSSession({ kind: 'preview' }, { automatic: false, allowDisabled: true })
    if (id === undefined) return
    appendTTSText(id, text)
    finishTTSSource(id)
}
export const jumpToTTSSource = async () => {
    const session = useTTSState.getState().session
    if (session?.chatId === undefined || session.messageId === undefined) return
    const chat = Chats.db.query.chatRow(session.chatId)
    const rows = Chats.db.live.messageIds(session.chatId).sync()
    const index = rows.findIndex((row) => row.id === session.messageId)
    if (!chat || index === -1) {
        Logger.warnToast(t('tts.sourceUnavailable'))
        return
    }
    await Characters.useCharacterState.getState().setCard(chat.character_id)
    // The clicked destination remains valid even if playback finishes while loading it.
    if (!(await Chats.actions.loadChat(session.chatId))) return
    Chats.useChatState.getState().setChat(session.chatId, { cause: 'search', index: index })
    router.navigate('/screens/ChatScreen')
}
