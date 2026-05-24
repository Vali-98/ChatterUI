import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, View, Text } from 'react-native'
import { create } from 'zustand'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Alert from '@components/views/Alert'
import BottomSheet from '@components/views/BottomSheet'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
import { useDebounceTokenizer } from '@lib/hooks/Tokenizer'
import { AuthorNote, AuthorNotes } from '@lib/state/AuthorNotes'
import { Theme } from '@lib/theme/ThemeManager'

type AuthorNoteEditorStateProps = {
    visible: boolean
    setVisible: (show: boolean, noteId?: number) => void
    noteId?: number
}

export const authorNoteEditorState = create<AuthorNoteEditorStateProps>()((set) => ({
    visible: false,
    setVisible: (visible, noteId) => set({ visible, noteId }),
}))

const AuthorNoteEditor = () => {
    const { t } = useTranslation()
    const tokenizer = Tokenizer.useTokenizer()
    const { color, spacing, fontSize } = Theme.useTheme()
    const { visible, setVisible, noteId } = authorNoteEditorState((state) => state)
    const [placeHolderNote, setPlaceHolderNote] = useState<AuthorNote | undefined>(undefined)
    const {
        data: [note],
    } = useLiveQueryJoined(AuthorNotes.db.live.note(noteId ?? -1), [noteId], {
        targets: [
            {
                tableName: 'author_notes',
                rowId: noteId ?? -1,
            },
        ],
    })
    const contentTokens = useDebounceTokenizer(placeHolderNote?.content ?? '', 300)

    useEffect(() => {
        visible && note && setPlaceHolderNote(note)
    }, [note, visible])

    // TODO: This should safely return if invalid values were given
    if (note === undefined || placeHolderNote === undefined || !noteId || !visible) return

    return (
        <BottomSheet sheetStyle={{ flex: 1 }} visible={visible} setVisible={setVisible}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ rowGap: spacing.xl, paddingBottom: spacing.xl2 }}>
                <ThemedTextInput
                    label={t('common.labels.name')}
                    containerStyle={{ flex: 0 }}
                    value={placeHolderNote.name}
                    onChangeText={(t) => {
                        setPlaceHolderNote({ ...placeHolderNote, name: t })
                    }}
                />
                <ThemedTextInput
                    label={t('authorNotes.item.content', { tokenLength: contentTokens })}
                    containerStyle={{ flex: 0 }}
                    numberOfLines={10}
                    value={placeHolderNote.content}
                    onChangeText={(t) => {
                        setPlaceHolderNote({ ...placeHolderNote, content: t })
                    }}
                />
                <Text style={{ color: color.text._700, fontSize: fontSize.s }}>
                    {t('common.labels.tokens')}: {contentTokens}
                </Text>

                <ThemedTextInput
                    label={t('authorNotes.item.comments')}
                    containerStyle={{ flex: 0 }}
                    numberOfLines={2}
                    value={placeHolderNote.note}
                    onChangeText={(t) => {
                        setPlaceHolderNote({ ...placeHolderNote, note: t })
                    }}
                />
                <ThemedSlider
                    label={t('authorNotes.item.priority')}
                    min={0}
                    max={1000}
                    step={1}
                    value={placeHolderNote.priority ?? 0}
                    onValueChange={(value) =>
                        setPlaceHolderNote({ ...placeHolderNote, priority: value })
                    }
                />
            </ScrollView>
            <View
                style={{
                    flexDirection: 'row',
                    columnGap: spacing.l,
                    justifyContent: 'space-between',
                    paddingTop: 12,
                }}>
                <ThemedButton
                    label={t('common.actions.delete')}
                    variant="critical"
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
                                    },
                                },
                            ],
                        })
                    }}
                />
                <ThemedButton
                    label={t('common.actions.reset')}
                    variant="tertiary"
                    iconName="reload"
                    onPress={async () => {
                        setPlaceHolderNote(note)
                    }}
                />
                <ThemedButton
                    label={t('common.actions.save')}
                    variant="secondary"
                    iconName="save"
                    onPress={async () => {
                        await AuthorNotes.db.mutate.updateNote(note.id, {
                            name: placeHolderNote.name,
                            content: placeHolderNote.content,
                            note: placeHolderNote.note,
                            priority: placeHolderNote.priority,
                            token_length: await tokenizer(placeHolderNote.content),
                        })
                    }}
                />
            </View>
        </BottomSheet>
    )
}

export default AuthorNoteEditor
