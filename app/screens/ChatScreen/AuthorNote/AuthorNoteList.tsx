import { FlatList } from 'react-native-gesture-handler'

import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { AuthorNotes, NoteType } from '@lib/state/AuthorNotes'
import { Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/chat'

import AuthorNoteEmpty from './AuthorNoteEmpty'
import AuthorNoteItem from './AuthorNoteItem'

type AuthorNoteListProps = {
    noteType: NoteType
}

const AuthorNoteList: React.FC<AuthorNoteListProps> = ({ noteType }) => {
    const { id: chatId } = Chats.useChatState()
    const { id: characterId } = Characters.useCharacterState()
    const { data: noteIdList } = useLiveQueryAsync(
        AuthorNotes.db.live.noteIds(noteType, chatId ?? -1, characterId ?? -1),
        {
            key: ['author-note-ids', noteType, characterId, chatId],
            watch: [{ table: 'author_notes' }],
        }
    )
    if (noteIdList.length === 0) return <AuthorNoteEmpty />

    return (
        <FlatList
            contentContainerStyle={{ rowGap: 8, paddingRight: 8 }}
            data={noteIdList}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <AuthorNoteItem id={item.id} />}
        />
    )
}

export default AuthorNoteList
