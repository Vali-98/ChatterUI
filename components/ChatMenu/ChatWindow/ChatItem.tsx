import { MaterialIcons } from '@expo/vector-icons'
import { Chats, Style } from '@globals'
import React, { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
//@ts-ignore
import Markdown from 'react-native-markdown-package'
//@ts-ignore
import AnimatedEllipsis from 'rn-animated-ellipsis'
import SimpleMarkdown from 'simple-markdown'
import { ChatEntry } from '@constants/Chat'
import { useShallow } from 'zustand/react/shallow'
import Swipes from './Swipes'
import ChatFrame from './ChatFrame'
import AnimatedView from '@components/AnimatedView'

type ChatItemProps = {
    id: number
    nowGenerating: boolean
    charName: string
    userName: string
    TTSenabled: boolean
}

const ChatItem: React.FC<ChatItemProps> = ({
    id,
    nowGenerating,
    charName,
    userName,
    TTSenabled,
}) => {
    const message: ChatEntry =
        Chats.useChat(useShallow((state) => state?.data?.[id])) ?? Chats.createEntry('', false, '')
    const messagesLength = Chats.useChat(useShallow((state) => state.data?.length)) ?? -1

    const [placeholderText, setPlaceholderText] = useState(message.mes)
    const [editMode, setEditMode] = useState(false)

    const { updateChat, deleteChat, saveChat } = Chats.useChat(
        useShallow((state) => ({
            updateChat: state.updateEntry,
            deleteChat: state.deleteEntry,
            saveChat: state.save,
        }))
    )

    const buffer = Chats.useChat((state) => (id === messagesLength - 1 ? state.buffer : ''))

    const handleEditMessage = () => {
        updateChat(id, placeholderText)
        saveChat()
        setEditMode(false)
    }

    const handleDeleteMessage = () => {
        deleteChat(id)
        saveChat()
        setEditMode(false)
    }
    const handleEnableEdit = () => {
        setPlaceholderText(message.mes)
        setEditMode(!nowGenerating)
    }

    const handleDisableEdit = () => {
        setPlaceholderText(message.mes)
        setEditMode((editMode) => false)
    }

    const isFirstWithSwipes = id === 0 && message.swipes.length > 1 && messagesLength === 1
    const isLastMessage = id === messagesLength - 1 && messagesLength !== 1
    const showSwipe = !message.is_user && (isFirstWithSwipes || isLastMessage)

    const showEditor = editMode && !nowGenerating
    const showEllipsis =
        !message.is_user && buffer === '' && id === messagesLength - 1 && nowGenerating

    type EditorProps = {
        name: 'delete' | 'check' | 'close'
        onPress: () => void
    }

    const EditorButton = ({ name, onPress }: EditorProps) => (
        <TouchableOpacity style={styles.editButton} onPress={onPress}>
            <MaterialIcons name={name} size={28} color={Style.getColor('primary-text1')} />
        </TouchableOpacity>
    )

    return (
        <AnimatedView dy={100} fade={0} fduration={200} tduration={400}>
            <View
                style={{
                    ...styles.chatItem,
                }}>
                <ChatFrame
                    charName={charName}
                    userName={userName}
                    message={message}
                    id={id}
                    isLast={id === messagesLength - 1}
                    TTSenabled={TTSenabled}>
                    {showEllipsis && (
                        <View style={{ ...styles.messageTextContainer, padding: 5 }}>
                            <AnimatedEllipsis
                                style={{ color: Style.getColor('primary-text2'), fontSize: 20 }}
                            />
                        </View>
                    )}

                    {showEditor && (
                        <View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    marginBottom: 2,
                                }}>
                                {id !== 0 && (
                                    <EditorButton name="delete" onPress={handleDeleteMessage} />
                                )}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                    }}>
                                    <EditorButton name="check" onPress={handleEditMessage} />
                                    <EditorButton name="close" onPress={handleDisableEdit} />
                                </View>
                            </View>
                            <View style={styles.messageInput}>
                                <TextInput
                                    style={{ color: Style.getColor('primary-text1') }}
                                    value={placeholderText}
                                    onChangeText={setPlaceholderText}
                                    textBreakStrategy="simple"
                                    multiline
                                    autoFocus
                                />
                            </View>
                        </View>
                    )}

                    {!showEditor && !showEllipsis && (
                        <TouchableOpacity
                            style={styles.messageTextContainer}
                            activeOpacity={0.7}
                            onLongPress={handleEnableEdit}>
                            <Markdown
                                style={styles.messageText}
                                rules={{ speech }}
                                styles={markdownFormat}>
                                {nowGenerating && id === messagesLength - 1
                                    ? buffer.trim()
                                    : message.mes.trim()}
                            </Markdown>
                        </TouchableOpacity>
                    )}
                    {!showEditor && showSwipe && (
                        <Swipes message={message} id={id} nowGenerating={nowGenerating} />
                    )}
                </ChatFrame>
            </View>
        </AnimatedView>
    )
}

export { ChatItem }

const styles = StyleSheet.create({
    chatItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },

    messageText: {
        textAlignVertical: 'top',
    },

    messageTextContainer: {
        backgroundColor: Style.getColor('primary-surface3'),
        paddingHorizontal: 8,
        borderRadius: 8,
        textAlignVertical: 'center',
        shadowColor: Style.getColor('primary-shadow'),
        elevation: 4,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginBottom: 4,
        marginLeft: 4,
        marginRight: 8,
    },

    editButton: {
        marginRight: 12,
    },

    messageInput: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
    },
})

const speechStyle = { color: '#e69d17' }
const speech = {
    order: SimpleMarkdown.defaultRules.em.order + 0.6,
    match(source: string, state: any, lookbehind: any) {
        return /^"([\s\S]+?)"(?!")/.exec(source)
    },
    parse(capture: any, parse: any, state: any) {
        return {
            content: parse(capture[1], state),
        }
    },
    react(node: any, output: any, { ...state }) {
        state.withinText = true
        state.style = {
            ...(state.style || {}),
            ...speechStyle,
        }
        return React.createElement(
            Text,
            {
                key: state.key,
                style: speechStyle,
            },
            `"`,
            output(node.content, state),
            `"`
        )
    },
    html: undefined,
}
const markdownFormat = {
    em: {
        color: Style.getColor('primary-text2'),
        fontStyle: 'italic',
    },
    text: {
        color: Style.getColor('primary-text1'),
    },
    list: {
        color: Style.getColor('primary-text1'),
    },
}
