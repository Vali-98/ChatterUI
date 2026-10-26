import { setStringAsync } from 'expo-clipboard'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import Alert from '@components/views/Alert'
import { ChatControlPanel } from '@components/views/ChatControlColumn'
import { ChatSwipe } from '@db/schema'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useBackAction } from '@lib/hooks/BackAction'
import { AuthorNotes } from '@lib/state/AuthorNotes'
import { Chats } from '@lib/state/chat'
import { authorNoteEditorState } from '@lib/state/components/AuthorNotes'
import { useChatActionsState } from '@lib/state/components/ChatControls'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'

import { useAuthorNoteState } from '../AuthorNote'
import { useChatEditorStore } from './ChatEditor'
import ChatTTS from './ChatTTS'

interface ChatActionProps {
    entryId: number
    isGenerating: boolean
    swipe: ChatSwipe
}

const ChatQuickActions: React.FC<ChatActionProps> = ({ entryId, isGenerating, swipe }) => {
    const setShowOptions = useChatActionsState((state) => state.setActiveIndex)
    const showEditor = useChatEditorStore((state) => state.show)
    const showNoteEditor = authorNoteEditorState(useShallow((state) => state.open))
    const ref = useAuthorNoteState(useShallow((state) => state.ref))
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const [quickDelete] = useMMKVBoolean(AppSettings.QuickDelete)
    const { chatId, setId } = Chats.useChat()

    const handleEnableEdit = () => {
        setShowOptions(undefined)
        if (!isGenerating) showEditor(entryId)
    }

    const handleFork = () => {
        if (!chatId) return
        Alert.alert({
            title: t('chat.quickActions.fork.title'),
            description: t('chat.quickActions.fork.description'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('chat.quickActions.fork.button'),
                    onPress: async () => {
                        const newChatId = await Chats.actions.duplicateChat(chatId, {
                            throughMessageId: entryId,
                        })
                        if (!newChatId) {
                            Logger.errorToast(t('chat.quickActions.errors.cloneFailed'))
                            return
                        }
                        setShowOptions(undefined)
                        setId(newChatId)
                    },
                },
            ],
        })
    }

    const handleCreateAuthorNote = () => {
        if (!chatId) return
        Alert.alert({
            title: t('chat.quickActions.createNote.title'),
            description: t('chat.quickActions.createNote.description'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('chat.quickActions.createNote.button'),
                    onPress: async () => {
                        const newNoteId = await AuthorNotes.db.mutate.createNote({
                            chat_id: chatId,
                            content: swipe.swipe,
                            depth: 1,
                        })
                        if (!newNoteId) {
                            Logger.errorToast(t('chat.quickActions.errors.noteCreateFailed'))
                            return
                        }
                        ref?.current?.open()
                        showNoteEditor(newNoteId)
                    },
                },
            ],
        })
    }

    const backAction = useCallback(() => {
        if (!swipe) return false
        setShowOptions(undefined)
        return true
    }, [setShowOptions, swipe])

    useBackAction(backAction)

    if (!swipe) return

    return (
        <ChatControlPanel>
            {
                <>
                    {quickDelete && (
                        <Animated.View
                            style={{ flexDirection: 'row' }}
                            entering={ZoomIn.duration(200)}
                            exiting={ZoomOut.duration(200)}>
                            <ThemedButton
                                variant="tertiary"
                                iconName="delete"
                                iconSize={24}
                                iconStyle={{
                                    color: color.error._400,
                                }}
                                onPress={() => {
                                    setShowOptions(undefined)
                                    Chats.actions.deleteMessage(entryId)
                                }}
                            />
                            <View
                                style={{
                                    borderColor: color.primary._500,
                                    borderLeftWidth: 1,
                                    marginLeft: 12,
                                    marginRight: 4,
                                }}
                            />
                        </Animated.View>
                    )}
                    <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                        <ThemedButton
                            variant="tertiary"
                            iconName="font-colors"
                            iconSize={22}
                            iconStyle={{
                                color: color.text._500,
                            }}
                            onPress={handleCreateAuthorNote}
                        />
                    </Animated.View>
                    <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                        <ThemedButton
                            variant="tertiary"
                            iconName="fork"
                            iconSize={22}
                            iconStyle={{
                                color: color.text._500,
                            }}
                            onPress={handleFork}
                        />
                    </Animated.View>

                    <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                        <ThemedButton
                            variant="tertiary"
                            iconName="copy"
                            iconSize={22}
                            iconStyle={{
                                color: color.text._500,
                            }}
                            onPress={() => {
                                setShowOptions(undefined)
                                setStringAsync(swipe.swipe)
                                    .then(() => {
                                        Logger.infoToast(t('chat.quickActions.messages.copied'))
                                    })
                                    .catch(() => {
                                        Logger.errorToast(t('chat.quickActions.errors.copyFailed'))
                                    })
                            }}
                        />
                    </Animated.View>

                    <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
                        <ThemedButton
                            variant="tertiary"
                            iconName="edit"
                            iconSize={24}
                            iconStyle={{
                                color: color.text._500,
                            }}
                            onPress={handleEnableEdit}
                        />
                    </Animated.View>
                </>
            }
            <ChatTTS swipe={swipe} />
        </ChatControlPanel>
    )
}

export default ChatQuickActions
