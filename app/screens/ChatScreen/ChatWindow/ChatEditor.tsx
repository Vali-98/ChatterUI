import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { create } from 'zustand'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import BottomSheet, { BottomSheetRef, createBottomSheetRef } from '@components/views/BottomSheet'
import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
import { Chats } from '@lib/state/Chat'
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
    const { data: entry } = useLiveQuery(Chats.db.live.entry(entryId), [entryId])
    const { data: swipe } = useLiveQueryJoined(
        Chats.db.live.activeSwipeByEntry(entryId),
        [entryId],
        {
            onUpdated: (result) => {
                const swipe = result?.swipe
                setPlaceholderText(swipe ?? '')
            },
        }
    )

    const handleEditMessage = () => {
        hide()
        if (swipe && placeholderText !== swipe.swipe)
            Chats.db.mutate.updateChatSwipe(swipe.id, placeholderText)
    }

    const handleDeleteMessage = () => {
        hide()
        Chats.db.mutate.deleteChatEntry(entryId)
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
