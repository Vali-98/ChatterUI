import { launchImageLibraryAsync } from 'expo-image-picker'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, ScrollView, Pressable } from 'react-native'
import { create } from 'zustand'

import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'
import HorizontalSelector from '@components/input/HorizontalSelector'
import ThemedTextInput from '@components/input/ThemedTextInput'
import AttachmentViewer from '@components/media/AttachmentViewer'
import AudioAttachment from '@components/media/AudioAttachment'
import TText from '@components/text/TText'
import BottomSheet, { BottomSheetRef, createBottomSheetRef } from '@components/views/BottomSheet'
import BottomSheetControls, { BottomSheetButton } from '@components/views/BottomSheetControls'
import ScaledImage from '@components/views/ScaledImage'
import { pickAudioAttachments } from '@lib/audio/files'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Chats, type ChatMessage } from '@lib/state/chat'
import { useChatEditable } from '@lib/state/chat/access'
import { Logger } from '@lib/state/Logger'

type EditorField = 'content' | 'reasoning' | 'attachments'
type DraftAttachment = { id?: number; uri: string; name: string; type: string; mime_type?: string }

type ChatEditorStateProps = {
    entryId: number
    session: number
    ref: BottomSheetRef
    hide: () => void
    show: (entryId: number) => void
}

export const useChatEditorStore = create<ChatEditorStateProps>()((set, get) => ({
    entryId: 0,
    session: 0,
    ref: createBottomSheetRef(),
    hide: () => {
        get().ref.current?.close()
    },
    show: (entryId) => {
        set((state) => ({ entryId: entryId, session: state.session + 1 }))
        get().ref.current?.open()
    },
}))

const MessageEditor = ({
    entry,
    editable,
    onClose,
}: {
    entry: ChatMessage
    editable: boolean
    onClose: () => void
}) => {
    const { t } = useTranslation()
    const [original] = useState(entry)
    const swipe = original.swipes[0]
    const hasAttachments = original.attachments.length > 0
    const hasReasoning = !!swipe.reasoning?.content
    const initialDraft = () => ({
        content: swipe.swipe,
        reasoning: swipe.reasoning?.content ?? '',
        attachments: original.attachments as DraftAttachment[],
    })
    const [draft, setDraft] = useState(initialDraft)
    const [field, setField] = useState<EditorField>('content')
    const [saving, setSaving] = useState(false)
    const [viewerIndex, setViewerIndex] = useState<number>()
    const images = draft.attachments.filter((item) => item.type === 'image')
    const save = async () => {
        if (!editable || saving) return
        setSaving(true)
        try {
            await Chats.actions.editMessage(entry.id, {
                swipeId: swipe.id,
                text: draft.content,
                reasoning: draft.reasoning,
                retainedAttachmentIds: draft.attachments.flatMap((item) =>
                    item.id !== undefined ? [item.id] : []
                ),
                attachmentUris: draft.attachments
                    .filter((item) => item.id === undefined)
                    .map((item) => item.uri),
            })
            onClose()
        } catch (error) {
            Logger.error(error)
            Logger.errorToast(t('chat.attachments.editFailed'))
        } finally {
            setSaving(false)
        }
    }
    const addImages = async () => {
        try {
            const result = await launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 1,
            })
            if (result.canceled) return
            setDraft((draft) => ({
                ...draft,
                attachments: [
                    ...draft.attachments,
                    ...result.assets
                        .filter(
                            (asset) => !draft.attachments.some((item) => item.uri === asset.uri)
                        )
                        .map((asset) => ({
                            uri: asset.uri,
                            name: asset.fileName ?? asset.uri.split('/').pop() ?? '',
                            type: 'image',
                        })),
                ],
            }))
        } catch (error) {
            Logger.error(error)
            Logger.errorToast(t('chat.attachments.addFailed'))
        }
    }
    return (
        <>
            <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 12 }}>
                <TText size={18} numberOfLines={1} style={{ flex: 1 }}>
                    {entry.name}
                </TText>
                <TText color="400" size={12}>
                    {swipe.send_date.toLocaleTimeString()}
                </TText>
            </View>
            <View style={{ flexShrink: 1, rowGap: 0 }}>
                {(hasAttachments || hasReasoning) && (
                    <HorizontalSelector<EditorField>
                        selected={field}
                        values={[
                            { value: 'content', label: t('chat.reasoning.content') },
                            ...(hasReasoning
                                ? [
                                      {
                                          value: 'reasoning' as EditorField,
                                          label: t('chat.reasoning.label'),
                                      },
                                  ]
                                : []),
                            ...(hasAttachments
                                ? [
                                      {
                                          value: 'attachments' as EditorField,
                                          label: t('chat.attachments.title'),
                                      },
                                  ]
                                : []),
                        ]}
                        style={{ flex: 0, marginBottom: 0 }}
                        onPress={setField}
                    />
                )}
                {field === 'attachments' ? (
                    <ScrollView contentContainerStyle={{ rowGap: 12, paddingBottom: 8 }}>
                        {draft.attachments.length === 0 && (
                            <TText color="400" style={{ paddingVertical: 24 }}>
                                {t('chat.attachments.empty')}
                            </TText>
                        )}
                        {draft.attachments.map((item) => (
                            <View
                                key={item.uri}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    columnGap: 12,
                                }}>
                                {item.type === 'image' && (
                                    <Pressable onPress={() => setViewerIndex(images.indexOf(item))}>
                                        <ScaledImage
                                            uri={item.uri}
                                            style={{ height: 72, maxWidth: 120, borderRadius: 8 }}
                                        />
                                    </Pressable>
                                )}
                                {item.type === 'audio' ? (
                                    <View style={{ flex: 1 }}>
                                        <AudioAttachment
                                            source={{
                                                uri: item.uri,
                                                name: item.name,
                                                chatId: entry.chat_id,
                                                messageId: entry.id,
                                            }}
                                        />
                                    </View>
                                ) : (
                                    <TText numberOfLines={2} style={{ flex: 1 }}>
                                        {item.name}
                                    </TText>
                                )}
                                <IconButton
                                    iconName="close"
                                    variant="tertiary"
                                    accessibilityLabel={t('chat.attachments.remove')}
                                    onPress={() =>
                                        setDraft((draft) => ({
                                            ...draft,
                                            attachments: draft.attachments.filter(
                                                (attachment) => attachment !== item
                                            ),
                                        }))
                                    }
                                    disabled={saving}
                                />
                            </View>
                        ))}
                        <ThemedButton
                            iconName="picture"
                            label={t('chat.input.actions.addImage')}
                            variant="secondary"
                            onPress={addImages}
                            disabled={saving}
                            viewStyle={{ paddingHorizontal: 8 }}
                        />
                        <ThemedButton
                            iconName="sound"
                            label={t('audio.add')}
                            variant="secondary"
                            onPress={async () => {
                                try {
                                    const selected = await pickAudioAttachments()
                                    setDraft((draft) => ({
                                        ...draft,
                                        attachments: [
                                            ...draft.attachments,
                                            ...selected.filter(
                                                (item) =>
                                                    !draft.attachments.some(
                                                        (existing) => existing.uri === item.uri
                                                    )
                                            ),
                                        ],
                                    }))
                                } catch (error) {
                                    Logger.errorToast(t('audio.addFailed'), error)
                                }
                            }}
                            disabled={saving}
                            viewStyle={{ paddingHorizontal: 8 }}
                        />
                    </ScrollView>
                ) : (
                    <ThemedTextInput
                        containerStyle={{ flex: 0, flexShrink: 1 }}
                        value={draft[field]}
                        editable={!saving}
                        onChangeText={(text) => setDraft((draft) => ({ ...draft, [field]: text }))}
                        multiline
                    />
                )}
            </View>
            <BottomSheetControls>
                <BottomSheetButton
                    label={t('chat.editor.actions.delete')}
                    iconName="delete"
                    variant="secondary"
                    onPress={() => {
                        try {
                            Chats.actions.deleteMessage(entry.id)
                            onClose()
                        } catch (error) {
                            Logger.error(error)
                            Logger.errorToast(t('chat.attachments.editFailed'))
                        }
                    }}
                    level="error"
                    disabled={saving}
                />
                <BottomSheetButton
                    iconName="reload"
                    variant="tertiary"
                    label={t('chat.editor.actions.reset')}
                    onPress={() => setDraft(initialDraft())}
                    disabled={saving}
                />
                <BottomSheetButton
                    label={t('chat.editor.actions.confirm')}
                    iconName="check"
                    variant="secondary"
                    onPress={save}
                    disabled={saving || !editable}
                />
            </BottomSheetControls>
            {viewerIndex !== undefined && (
                <AttachmentViewer
                    images={images}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerIndex(undefined)}
                />
            )}
        </>
    )
}

const ChatEditor = () => {
    const { entryId, session, hide, ref } = useChatEditorStore()
    const { data: entry } = useLiveQueryAsync(Chats.db.live.message(entryId), {
        keepPreviousData: false,
        key: ['chat-editor-entry', entryId],
        watch: [
            { table: 'chat_entries', rowId: entryId },
            { table: 'chat_swipes' },
            { table: 'swipe_reasoning' },
            { table: 'chat_attachment' },
        ],
        enabled: entryId !== 0,
    })
    const currentSession = useRef(session)
    useEffect(() => {
        currentSession.current = session
    }, [session])
    const editable = useChatEditable(entry?.chat_id ?? -1)
    useEffect(() => {
        if (entry && !editable) hide()
    }, [entry, editable, hide])
    return (
        <BottomSheet
            sheetStyle={{ rowGap: 12, maxHeight: '95%' }}
            ref={ref}
            bodyContainerStyle={[{ paddingHorizontal: 16, paddingVertical: 16 }, { rowGap: 12 }]}>
            {entry?.swipes[0] && (
                <MessageEditor
                    key={`${entryId}-${session}`}
                    entry={entry}
                    editable={editable}
                    onClose={() => {
                        if (currentSession.current === session) hide()
                    }}
                />
            )}
        </BottomSheet>
    )
}

export default ChatEditor
