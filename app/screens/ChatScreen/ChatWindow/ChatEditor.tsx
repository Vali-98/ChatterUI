import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { create } from 'zustand'

import ThemedButton from '@components/buttons/ThemedButton'
import HorizontalSelector from '@components/input/HorizontalSelector'
import ThemedTextInput from '@components/input/ThemedTextInput'
import BottomSheet, { BottomSheetRef, createBottomSheetRef } from '@components/views/BottomSheet'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Chats } from '@lib/state/chat'
import { useChatEditable } from '@lib/state/chat/access'
import { Theme } from '@lib/theme/ThemeManager'

type ChatEditorStateProps = {
    entryId: number
    ref: BottomSheetRef
    hide: () => void
    show: (index: number) => void
}

//TODO: This is somewhat unsafe, as it always expects index to be valid at 0
export const useChatEditorStore = create<ChatEditorStateProps>()((set, get) => ({
    entryId: 0,
    ref: createBottomSheetRef(),
    editMode: false,
    hide: () => {
        get().ref.current?.close()
    },
    show: (entryId) => {
        set({ entryId })
        get().ref.current?.open()
    },
}))

const ChatEditor = () => {
    const { t } = useTranslation()
    const { entryId, hide, ref } = useChatEditorStore()
    const styles = useStyles()
    const [draft, setDraft] = useState({
        content: '',
        reasoning: '',
        field: 'content' as 'content' | 'reasoning',
    })
    const { data: entry } = useLiveQueryAsync(Chats.db.live.message(entryId), {
        keepPreviousData: false,
        key: ['chat-editor-entry', entryId],
        watch: [
            { table: 'chat_entries', rowId: entryId },
            { table: 'chat_swipes' },
            { table: 'swipe_reasoning' },
            { table: 'chat_attachment' },
        ],
    })
    const editable = useChatEditable(entry?.chat_id ?? -1)
    useEffect(() => {
        if (entry && !editable) hide()
    }, [entry, editable, hide])
    const swipe = entry?.swipes[0]
    useEffect(() => {
        // Refresh the local draft when its saved database record changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft({
            content: swipe?.swipe ?? '',
            reasoning: swipe?.reasoning?.content ?? '',
            field: 'content',
        })
    }, [swipe])

    const handleEditMessage = () => {
        if (!editable) return
        hide()
        if (
            swipe &&
            (draft.content !== swipe.swipe || draft.reasoning !== (swipe.reasoning?.content ?? ''))
        )
            Chats.actions.editSwipe(swipe.id, { text: draft.content, reasoning: draft.reasoning })
    }

    const handleDeleteMessage = () => {
        if (!editable) return
        hide()
        Chats.actions.deleteMessage(entryId)
    }

    return (
        <BottomSheet sheetStyle={{ rowGap: 12, maxHeight: '95%' }} ref={ref}>
            {swipe !== undefined && (
                <>
                    <View style={styles.topText}>
                        <Text numberOfLines={1} style={styles.nameText} ellipsizeMode="tail">
                            {entry?.name}
                        </Text>
                        <Text style={styles.timeText}>{swipe?.send_date.toLocaleTimeString()}</Text>
                    </View>

                    {!!swipe.reasoning?.content && (
                        <HorizontalSelector<'content' | 'reasoning'>
                            selected={draft.field}
                            values={[
                                { value: 'content', label: t('chat.reasoning.content') },
                                { value: 'reasoning', label: t('chat.reasoning.label') },
                            ]}
                            style={{ flex: 0 }}
                            onPress={(field) => setDraft((draft) => ({ ...draft, field }))}
                        />
                    )}
                    <ThemedTextInput
                        containerStyle={{ flex: 0, flexShrink: 1 }}
                        value={draft[draft.field]}
                        onChangeText={(text) =>
                            setDraft((draft) => ({ ...draft, [draft.field]: text }))
                        }
                        multiline
                    />

                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }}>
                        <ThemedButton
                            label={t('chat.editor.actions.delete')}
                            iconName="delete"
                            onPress={handleDeleteMessage}
                            variant="critical"
                        />
                        <ThemedButton
                            iconName="reload"
                            variant="tertiary"
                            label={t('chat.editor.actions.reset')}
                            onPress={() =>
                                setDraft({
                                    content: swipe?.swipe ?? '',
                                    reasoning: swipe?.reasoning?.content ?? '',
                                    field: 'content',
                                })
                            }
                        />
                        <ThemedButton
                            label={t('chat.editor.actions.confirm')}
                            iconName="check"
                            onPress={handleEditMessage}
                            variant="secondary"
                        />
                    </View>
                </>
            )}
        </BottomSheet>
    )
}

export default ChatEditor

const useStyles = () => {
    const { color, spacing, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        topText: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            columnGap: 12,
            shadowColor: color.shadow,
            borderTopRightRadius: spacing.m,
            borderTopLeftRadius: spacing.m,
        },

        nameText: {
            color: color.text._100,
            fontSize: fontSize.l,
        },

        timeText: {
            color: color.text._400,
            fontSize: fontSize.s,
        },

        messageInput: {
            color: color.text._100,
            borderColor: color.neutral._400,
            borderRadius: 8,
            borderWidth: 1,
            padding: 8,
        },
    })
}
