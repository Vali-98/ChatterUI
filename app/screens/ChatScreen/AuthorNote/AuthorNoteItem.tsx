import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
import { AuthorNotes } from '@lib/state/AuthorNotes'
import { authorNoteEditorState } from '@lib/state/components/AuthorNotes'
import { Theme } from '@lib/theme/ThemeManager'

type AuthorNoteItemProps = {
    id: number
}

const AuthorNoteItem: React.FC<AuthorNoteItemProps> = ({ id }) => {
    const { t } = useTranslation()
    const { color, spacing, fontSize, borderRadius } = Theme.useTheme()
    const open = authorNoteEditorState(useShallow((state) => state.open))
    const {
        data: [note],
    } = useLiveQueryJoined(AuthorNotes.db.live.note(id), [id], {
        targets: [{ tableName: 'author_notes', rowId: id }],
    })
    if (!note)
        return (
            <Animated.View
                exiting={FadeOut}
                style={{
                    borderRadius: borderRadius.l,
                    height: 96,
                    backgroundColor: color.neutral._200 + '55',
                }}
            />
        )

    return (
        <Animated.View
            entering={FadeIn}
            style={{
                borderRadius: borderRadius.l,
                minHeight: 96,
                paddingVertical: spacing.m,
                paddingHorizontal: spacing.l,
                backgroundColor: color.neutral._200 + '55',
            }}>
            <View
                style={{
                    flexDirection: 'row',
                    columnGap: spacing.xl,
                    alignItems: 'center',
                    flex: 1,
                }}>
                <ThemedSwitch
                    value={note.active}
                    onChangeValue={(active) => {
                        AuthorNotes.db.mutate.updateNote(note.id, { active: active })
                    }}
                />
                <View style={{ flex: 1, rowGap: 4 }}>
                    <Text style={{ color: color.text._400, fontSize: fontSize.l }}>
                        {note.name}
                    </Text>
                    <Text style={{ color: color.text._700 }} numberOfLines={3} ellipsizeMode="tail">
                        {note.content.replaceAll('\n', ' ') || t('authorNotes.item.noContent')}
                    </Text>
                </View>
                <ThemedButton
                    iconName="edit"
                    variant="tertiary"
                    iconSize={24}
                    iconStyle={{ color: color.text._400 }}
                    onPress={() => {
                        open(id)
                    }}
                />
            </View>
        </Animated.View>
    )
}

export default AuthorNoteItem
