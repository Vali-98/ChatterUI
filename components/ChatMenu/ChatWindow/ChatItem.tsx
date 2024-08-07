import { MaterialIcons } from '@expo/vector-icons'
import { Chats, Style } from '@globals'
import React, { useEffect, useRef, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Animated,
    LayoutChangeEvent,
} from 'react-native'
//@ts-expect-error
import Markdown from 'react-native-markdown-package'
//@ts-expect-error
import AnimatedEllipsis from 'rn-animated-ellipsis'
import SimpleMarkdown from 'simple-markdown'
import { useShallow } from 'zustand/react/shallow'
import Swipes from './Swipes'
import ChatFrame from './ChatFrame'
import AnimatedView from '@components/AnimatedView'

type EditorProps = {
    name: 'delete' | 'check' | 'close'
    onPress: () => void
}

const EditorButton = ({ name, onPress }: EditorProps) => (
    <TouchableOpacity style={styles.editButton} onPress={onPress}>
        <MaterialIcons name={name} size={28} color={Style.getColor('primary-text1')} />
    </TouchableOpacity>
)

type ChatItemProps = {
    id: number
    nowGenerating: boolean
    charId: number
    userName: string
    TTSenabled: boolean
    messagesLength: number
}

const ChatItem: React.FC<ChatItemProps> = ({
    id,
    nowGenerating,
    charId,
    userName,
    TTSenabled,
    messagesLength,
}) => {
    const { updateChat, deleteChat, buffer, message } = Chats.useChat(
        useShallow((state) => ({
            updateChat: state.updateEntry,
            deleteChat: state.deleteEntry,
            buffer: id === messagesLength - 1 ? state.buffer : '',
            message: state?.data?.messages?.[id] ?? Chats.dummyEntry,
        }))
    )
    const mes = Chats.useChat(
        (state) =>
            state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1]
                .swipe ?? ''
    )

    const [editMode, setEditMode] = useState(false)
    const [placeholderText, setPlaceholderText] = useState('')

    const handleEditMessage = () => {
        updateChat(id, placeholderText, false)
        setEditMode(false)
    }

    const handleDeleteMessage = () => {
        deleteChat(id)
        setEditMode(false)
    }
    const handleEnableEdit = () => {
        setPlaceholderText(mes)
        setEditMode(!nowGenerating)
    }

    const handleDisableEdit = () => {
        setPlaceholderText(mes)
        setEditMode((editMode) => false)
    }

    const isFirstWithSwipes = id === 0 && message?.swipes?.length > 1 && messagesLength === 1
    const isLastMessage = id === messagesLength - 1 && messagesLength !== 1
    const showSwipe = !message.is_user && (isFirstWithSwipes || isLastMessage)

    const showEditor = editMode && !nowGenerating
    const showEllipsis =
        !message.is_user && buffer === '' && id === messagesLength - 1 && nowGenerating

    const animatedHeight = useRef(new Animated.Value(10)).current // initial height
    const height = useRef(0)

    const handleContentSizeChange = (event: LayoutChangeEvent) => {
        const newheight = event.nativeEvent.layout.height
        if (height.current === newheight) return
        height.current = newheight
        const oveflowPadding = 12
        Animated.timing(animatedHeight, {
            toValue: newheight + (nowGenerating ? oveflowPadding : 0),
            duration: 200,
            useNativeDriver: false,
        }).start()
    }

    useEffect(() => {
        if (!nowGenerating && height) {
            animatedHeight.stopAnimation()
            Animated.timing(animatedHeight, {
                toValue: height.current,
                duration: 200,
                useNativeDriver: false,
            }).start()
        } else if (nowGenerating && !mes) {
            animatedHeight.setValue(0)
            animatedHeight.stopAnimation()
        }
    }, [nowGenerating])

    return (
        <AnimatedView dy={100} fade={0} fduration={200} tduration={400}>
            <View
                style={{
                    ...styles.chatItem,
                }}>
                <ChatFrame
                    charId={charId}
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
                            <Animated.View
                                style={{
                                    height: animatedHeight,
                                    overflow: 'scroll',
                                }}>
                                <Markdown
                                    onLayout={handleContentSizeChange}
                                    style={styles.messageText}
                                    rules={{ speech }}
                                    styles={markdownFormat}>
                                    {nowGenerating && id === messagesLength - 1
                                        ? buffer.trim()
                                        : mes.trim()}
                                </Markdown>
                            </Animated.View>
                        </TouchableOpacity>
                    )}
                    {!showEditor && showSwipe && (
                        <Swipes message={message} index={id} nowGenerating={nowGenerating} />
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
        minHeight: 40,
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
    inlineCode: {
        color: Style.getColor('primary-text2'),
        backgroundColor: Style.getColor('primary-surface2'),
        padding: 16,
        borderRadius: 4,
    },
}
