import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import HorizontalSelector from '@components/input/HorizontalSelector'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Alert from '@components/views/Alert'
import BottomSheet from '@components/views/BottomSheet'
import BottomSheetControls, { BottomSheetButton } from '@components/views/BottomSheetControls'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { useDebounceTokenizer } from '@lib/hooks/Tokenizer'
import { AuthorNote, AuthorNotes, NoteType } from '@lib/state/AuthorNotes'
import { Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/chat'
import { authorNoteBodyState, authorNoteEditorState } from '@lib/state/components/AuthorNotes'
import { Theme } from '@lib/theme/ThemeManager'

const getNoteTypeFromIds = (note: AuthorNote) => {
    if (note.chat_id) return NoteType.CHAT
    if (note.character_id) return NoteType.CHARACTER
    return NoteType.GLOBAL
}

const getUpdateValue = (
    noteType: NoteType,
    characterId: number | undefined,
    chatId: number | undefined
) => {
    let updates: Partial<AuthorNote> | null = null
    switch (noteType) {
        case NoteType.CHARACTER:
            if (characterId) {
                updates = {
                    character_id: characterId,
                    chat_id: null,
                }
            }
            break

        case NoteType.CHAT:
            if (chatId) {
                updates = {
                    character_id: null,
                    chat_id: chatId,
                }
            }
            break

        case NoteType.GLOBAL:
            updates = {
                character_id: null,
                chat_id: null,
            }
            break
    }
    return updates
}

const AuthorNoteEditor = () => {
    const { t } = useTranslation()
    const tokenizer = Tokenizer.useTokenizer()
    const { color, spacing, fontSize } = Theme.useTheme()
    const setCurrentNoteType = authorNoteBodyState(useShallow((state) => state.setCurrentNoteType))
    const characterId = Characters.useCharacterState(useShallow((state) => state.id))
    const chatId = Chats.useChatState(useShallow((state) => state.id))
    const { close, noteId, ref } = authorNoteEditorState(useShallow((state) => state))
    const [placeHolderNote, setPlaceHolderNote] = useState<AuthorNote | undefined>(undefined)
    const [edited, setEdited] = useState(false)

    const handleSetPlaceholder = useCallback(
        (newNote: AuthorNote, edited = true) => {
            setPlaceHolderNote(newNote)
            setEdited(edited)
        },
        [setPlaceHolderNote, setEdited]
    )
    const {
        data: [note],
    } = useLiveQueryAsync(AuthorNotes.db.live.note(noteId ?? -1), {
        keepPreviousData: false,
        key: ['author-note-editor', noteId],
        watch: [{ table: 'author_notes', rowId: noteId ?? -1 }],
        enabled: noteId !== undefined,
    })
    useEffect(() => {
        // Refresh the local draft when its saved database record changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (note) handleSetPlaceholder(note)
    }, [note, handleSetPlaceholder])
    const contentTokens = useDebounceTokenizer(placeHolderNote?.content ?? '', 300)

    const backAction = useCallback(
        (close: () => void) => {
            if (!note || !placeHolderNote || !edited) return close()
            Alert.alert({
                title: t('authorNotes.unsavedChanges.title'),
                description: t('authorNotes.unsavedChanges.description'),
                buttons: [
                    { label: t('common.actions.cancel') },
                    {
                        label: t('authorNotes.unsavedChanges.discard'),
                        onPress: close,
                        type: 'warning',
                    },
                    {
                        label: t('common.actions.save'),
                        onPress: async () => {
                            await AuthorNotes.db.mutate.updateNote(note.id, placeHolderNote)
                            close()
                        },
                    },
                ],
            })
            return true
        },
        [note, placeHolderNote, edited, t]
    )

    const ready = note !== undefined && placeHolderNote !== undefined && noteId !== undefined
    useEffect(() => {
        if (ready) ref?.current?.open()
    }, [ready, noteId, ref])

    if (note === undefined || placeHolderNote === undefined || !noteId) return

    const handleUpdateNoteType = async (
        noteType: NoteType,
        characterId: number | undefined,
        chatId: number | undefined
    ) => {
        const updates = getUpdateValue(noteType, characterId, chatId)
        if (!updates) return
        const updated = await AuthorNotes.db.mutate.updateNote(note.id, updates).then(() => true)
        if (updated) setCurrentNoteType(noteType)
    }

    const selectedNoteType = getNoteTypeFromIds(placeHolderNote)
    return (
        <BottomSheet
            onRequestClose={backAction}
            sheetStyle={{ flex: 1 }}
            ref={ref}
            bodyContainerStyle={[{ paddingHorizontal: 16, paddingVertical: 16 }, { flex: 1 }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ rowGap: spacing.xl, paddingBottom: spacing.xl2 }}>
                <ThemedTextInput
                    label={t('common.labels.name')}
                    value={placeHolderNote.name}
                    onChangeText={(t) => {
                        handleSetPlaceholder({ ...placeHolderNote, name: t })
                    }}
                />
                <ThemedTextInput
                    label={t('authorNotes.item.content', { tokenLength: contentTokens })}
                    numberOfLines={10}
                    value={placeHolderNote.content}
                    onChangeText={(t) => {
                        handleSetPlaceholder({ ...placeHolderNote, content: t })
                    }}
                />
                <Text style={{ color: color.text._700, fontSize: fontSize.s }}>
                    {t('common.labels.tokens')}: {contentTokens}
                </Text>

                <ThemedTextInput
                    label={t('authorNotes.item.comments')}
                    numberOfLines={2}
                    value={placeHolderNote.note}
                    onChangeText={(t) => {
                        handleSetPlaceholder({ ...placeHolderNote, note: t })
                    }}
                />
                <ThemedSlider
                    label={t('authorNotes.item.priority')}
                    min={0}
                    max={1000}
                    step={1}
                    value={placeHolderNote.priority ?? 0}
                    onValueChange={(value) =>
                        handleSetPlaceholder({ ...placeHolderNote, priority: value })
                    }
                />
                <ThemedSlider
                    label={t('authorNotes.item.depth')}
                    min={0}
                    max={10}
                    step={1}
                    value={placeHolderNote.depth ?? 0}
                    onValueChange={(value) =>
                        handleSetPlaceholder({ ...placeHolderNote, depth: value })
                    }
                />
                <HorizontalSelector
                    label={t('authorNotes.type')}
                    values={[
                        { label: t('authorNotes.selector.chat'), value: NoteType.CHAT },
                        {
                            label: t('authorNotes.selector.character'),
                            value: NoteType.CHARACTER,
                        },
                        { label: t('authorNotes.selector.global'), value: NoteType.GLOBAL },
                    ]}
                    selected={selectedNoteType}
                    onPress={(type) => {
                        if (type === selectedNoteType) return
                        handleUpdateNoteType(type, characterId, chatId)
                    }}
                />
            </ScrollView>

            <BottomSheetControls>
                <BottomSheetButton
                    label={t('common.actions.delete')}
                    variant="secondary"
                    iconName="delete"
                    onPress={() => {
                        Alert.alert({
                            title: t('authorNotes.alert.delete.title'),
                            description: t('authorNotes.alert.delete.description', {
                                name: note.name,
                            }),
                            buttons: [
                                { label: t('common.actions.cancel') },
                                {
                                    label: t('authorNotes.alert.delete.button'),
                                    onPress: () => {
                                        AuthorNotes.db.mutate.deleteNote(note.id)
                                        close()
                                    },
                                },
                            ],
                        })
                    }}
                    level="error"
                />
                <BottomSheetButton
                    label={t('common.actions.reset')}
                    variant="tertiary"
                    iconName="reload"
                    onPress={() => handleSetPlaceholder(note, false)}
                />
                <BottomSheetButton
                    label={t('common.actions.save')}
                    variant="secondary"
                    iconName="save"
                    onPress={async () => {
                        await AuthorNotes.db.mutate.updateNote(note.id, {
                            name: placeHolderNote.name,
                            content: placeHolderNote.content,
                            note: placeHolderNote.note,
                            priority: placeHolderNote.priority,
                            depth: placeHolderNote.depth,
                            token_length: await tokenizer(placeHolderNote.content),
                        })
                        close()
                    }}
                />
            </BottomSheetControls>
        </BottomSheet>
    )
}

export default AuthorNoteEditor
