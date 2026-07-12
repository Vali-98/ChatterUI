import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import HorizontalSelector from '@components/input/HorizontalSelector'
import { AuthorNotes, NoteType } from '@lib/state/AuthorNotes'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { authorNoteBodyState } from '@lib/state/components/AuthorNotes'
import { Logger } from '@lib/state/Logger'

import AuthorNoteList from './AuthorNoteList'

const AuthorNoteBody = () => {
    const { t } = useTranslation()
    const { currentNoteType, setCurrentNoteType } = authorNoteBodyState(
        useShallow((state) => state)
    )
    const { id: chatId } = Chats.useChatState()
    const { id: characterId } = Characters.useCharacterStore()

    const handleAddNote = () => {
        try {
            switch (currentNoteType) {
                case NoteType.GLOBAL:
                    AuthorNotes.db.mutate.createNote({ depth: 1 })
                    break
                case NoteType.CHARACTER:
                    if (characterId)
                        AuthorNotes.db.mutate.createNote({ character_id: characterId, depth: 1 })
                    break
                case NoteType.CHAT:
                    if (chatId) AuthorNotes.db.mutate.createNote({ chat_id: chatId, depth: 1 })
                    break
            }
        } catch (e) {
            Logger.errorToast(t('authorNotes.errors.create'), JSON.stringify(e))
        }
    }

    return (
        <View style={{ flex: 1 }}>
            <AuthorNoteList noteType={currentNoteType} />

            <View style={{ columnGap: 8, flexDirection: 'row' }}>
                <HorizontalSelector
                    style={{ flex: 1 }}
                    values={[
                        { label: t('authorNotes.selector.chat'), value: NoteType.CHAT },
                        {
                            label: t('authorNotes.selector.character'),
                            value: NoteType.CHARACTER,
                        },
                        { label: t('authorNotes.selector.global'), value: NoteType.GLOBAL },
                    ]}
                    selected={currentNoteType}
                    onPress={setCurrentNoteType}
                />
                <ThemedButton
                    buttonStyle={{ paddingHorizontal: 10 }}
                    variant="secondary"
                    iconName="plus"
                    onPress={handleAddNote}
                />
            </View>
        </View>
    )
}

export default AuthorNoteBody
