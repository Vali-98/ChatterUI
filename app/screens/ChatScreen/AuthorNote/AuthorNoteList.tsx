import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { FlatList } from 'react-native-gesture-handler'

import { AuthorNotes, NoteType } from '@lib/state/AuthorNotes'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'

import AuthorNoteEmpty from './AuthorNoteEmpty'
import AuthorNoteItem from './AuthorNoteItem'

type AuthorNoteListProps = {
    noteType: NoteType
}

const AuthorNoteList: React.FC<AuthorNoteListProps> = ({ noteType }) => {
    const { id: chatId } = Chats.useChatState()
    const { id: characterId } = Characters.useCharacterStore()
    const { data: noteIdList } = useLiveQuery(
        AuthorNotes.db.live.noteIds(noteType, chatId ?? -1, characterId ?? -1),
        [noteType, characterId, chatId]
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
