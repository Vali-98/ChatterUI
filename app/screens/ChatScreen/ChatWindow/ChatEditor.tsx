import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { create } from 'zustand'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import BottomSheet, { BottomSheetRef, createBottomSheetRef } from '@components/views/BottomSheet'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Chats } from '@lib/state/chat'
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
    const [placeholderText, setPlaceholderText] = useState('')
    const { data: entry } = useLiveQueryAsync(Chats.db.live.message(entryId), {
        keepPreviousData: false,
        key: ['chat-editor-entry', entryId],
        watch: [
            { table: 'chat_entries', rowId: entryId },
            { table: 'chat_swipes' },
            { table: 'chat_attachment' },
        ],
    })
    const { data: swipe } = useLiveQueryAsync(Chats.db.live.activeSwipe(entryId), {
        keepPreviousData: false,
        key: ['chat-editor-swipe', entryId],
        watch: [{ table: 'chat_swipes' }],
    })
    useEffect(() => {
        // Refresh the local draft when its saved database record changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlaceholderText(swipe?.swipe ?? '')
    }, [swipe])

    const handleEditMessage = () => {
        hide()
        if (swipe && placeholderText !== swipe.swipe)
            Chats.actions.updateSwipe(swipe.id, placeholderText)
    }

    const handleDeleteMessage = () => {
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

                    <ThemedTextInput
                        containerStyle={{ flex: 0, flexShrink: 1 }}
                        value={placeholderText}
                        onChangeText={setPlaceholderText}
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
                            onPress={() => setPlaceholderText(swipe?.swipe ?? '')}
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
