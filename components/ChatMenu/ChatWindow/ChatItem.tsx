import { AntDesign, MaterialIcons } from '@expo/vector-icons'
import { Global, Color, Chats, Characters, Users } from '@globals'
import React, { useRef, useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    Easing,
    TextInput,
    TouchableOpacity,
    ImageBackground,
} from 'react-native'
//@ts-ignore
import Markdown from 'react-native-markdown-package'
//@ts-ignore
import AnimatedEllipsis from 'rn-animated-ellipsis'
import SimpleMarkdown from 'simple-markdown'
import TTSMenu from './TTS'
import { ChatEntry } from '@constants/Chat'
// global chat property for editing
import { useShallow } from 'zustand/react/shallow'

type ChatItemProps = {
    id: number
    nowGenerating: boolean
    startGenerating: () => void
    charName: string
    userName: string
    TTSenabled: boolean
}

const ChatItem: React.FC<ChatItemProps> = ({
    id,
    nowGenerating,
    startGenerating,
    charName,
    userName,
    TTSenabled,
}) => {
    // fade in anim
    const fadeAnim = useRef(new Animated.Value(1)).current
    const dyAnim = useRef(new Animated.Value(0)).current
    // globals

    const message: ChatEntry =
        Chats.useChat(useShallow((state) => state?.data?.[id])) ?? Chats.createEntry('', false, '')
    const messagesLength = Chats.useChat(useShallow((state) => state.data?.length)) ?? -1

    const [placeholderText, setPlaceholderText] = useState(message.mes)
    const [editMode, setEditMode] = useState(false)

    const { updateChat, deleteChat, swipeChat, addSwipe, saveChat } = Chats.useChat(
        useShallow((state) => ({
            updateChat: state.updateEntry,
            deleteChat: state.deleteEntry,
            swipeChat: state.swipe,
            addSwipe: state.addSwipe,
            saveChat: state.save,
        }))
    )
    const buffer = Chats.useChat((state) => (id === messagesLength - 1 ? state.buffer : ''))

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1, // Target opacity 1 (fully visible)
                duration: 1000, // Duration in milliseconds
                useNativeDriver: true, // To improve performance
            }),
            Animated.timing(dyAnim, {
                toValue: 0, // Target translateY 0 (no translation)
                duration: 1000,
                useNativeDriver: true,
                easing: Easing.out(Easing.exp),
            }),
        ]).start()
    }, [])

    const markdownFormat = {
        em: {
            color: Color.TextItalic,
            fontStyle: 'italic',
        },
        text: {
            color: Color.Text,
        },
        list: {
            color: Color.Text,
        },
    }

    const handleSwipeLeft = () => {
        swipeChat(id, -1)
        saveChat()
    }

    const handleSwipeRight = async () => {
        const atLimit = swipeChat(id, 1)
        await saveChat()
        if (atLimit && id !== 0) {
            addSwipe()
            startGenerating()
        }
    }

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

    const deltaTime = Math.max(
        0,
        (Date.parse(message.gen_finished) - Date.parse(message.gen_started)) / 1000
    )

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: dyAnim }],
            }}>
            <View
                style={{
                    ...styles.chatItem,
                    ...(id === messagesLength - 1
                        ? { borderBottomWidth: 1, borderColor: Color.Offwhite }
                        : {}),
                }}>
                <View style={{ alignItems: 'center' }}>
                    <ImageBackground
                        imageStyle={styles.avatar}
                        style={styles.avatarBackgroundView}
                        source={require('@assets/user.png')}>
                        <Image
                            style={styles.avatar}
                            source={{
                                uri:
                                    message.name === charName
                                        ? Characters.getImageDir(charName)
                                        : Users.getImageDir(userName),
                            }}
                        />
                    </ImageBackground>
                    <Text style={styles.graytext}>#{id}</Text>
                    {message?.gen_started !== undefined &&
                        message?.gen_finished !== undefined &&
                        message.name === charName && (
                            <Text style={styles.graytext}>{deltaTime}s</Text>
                        )}
                    {TTSenabled && <TTSMenu message={message.mes} />}
                </View>

                <View style={{ flex: 1 }}>
                    <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, color: Color.Text, marginRight: 4 }}>
                            {message.name}
                        </Text>
                        <Text style={{ fontSize: 10, color: Color.Text }}>{message.send_date}</Text>

                        {!nowGenerating && editMode && (
                            <View style={{ flexDirection: 'row' }}>
                                {id !== 0 && (
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={handleDeleteMessage}>
                                        <MaterialIcons
                                            name="delete"
                                            size={28}
                                            color={Color.Button}
                                        />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={handleEditMessage}>
                                    <MaterialIcons name="check" size={28} color={Color.Button} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={handleDisableEdit}>
                                    <MaterialIcons name="close" size={28} color={Color.Button} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {!editMode || nowGenerating ? (
                        message.name === charName &&
                        buffer === '' &&
                        nowGenerating &&
                        id === messagesLength - 1 ? (
                            <View style={{ ...styles.messageTextContainer, padding: 5 }}>
                                <AnimatedEllipsis style={{ color: Color.White, fontSize: 20 }} />
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.messageTextContainer}
                                activeOpacity={0.7}
                                onLongPress={handleEnableEdit}>
                                <Markdown
                                    style={styles.messageText}
                                    styles={markdownFormat}
                                    rules={{ speech }}>
                                    {nowGenerating && id === messagesLength - 1
                                        ? buffer.trim()
                                        : message.mes.trim()}
                                </Markdown>
                            </TouchableOpacity>
                        )
                    ) : (
                        <View style={styles.messageInput}>
                            <TextInput
                                style={{ color: Color.Text }}
                                value={placeholderText}
                                onChangeText={setPlaceholderText}
                                textBreakStrategy="simple"
                                multiline
                            />
                        </View>
                    )}
                </View>
            </View>

            {((id === messagesLength - 1 &&
                message.name === charName &&
                message?.swipes !== undefined &&
                id !== 0) ||
                (id === 0 && message?.swipes !== undefined && message?.swipes?.length !== 1)) && (
                <View style={styles.swipesItem}>
                    {!nowGenerating && (
                        <TouchableOpacity
                            onPress={handleSwipeLeft}
                            disabled={message.swipe_id === 0}>
                            <AntDesign
                                name="left"
                                size={20}
                                color={message.swipe_id === 0 ? Color.Offwhite : Color.Button}
                            />
                        </TouchableOpacity>
                    )}
                    <View style={styles.swipeTextContainer}>
                        <Text style={styles.swipeText}>
                            {message.swipe_id + 1} / {message.swipes.length}
                        </Text>
                    </View>

                    {!nowGenerating && (
                        <TouchableOpacity onPress={handleSwipeRight}>
                            <AntDesign name="right" size={20} color={Color.Button} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </Animated.View>
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
        backgroundColor: Color.Container,
        paddingHorizontal: 8,
        borderRadius: 8,
        textAlignVertical: 'center',
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
    },

    avatarBackgroundView: {
        marginBottom: 4,
        marginLeft: 4,
        marginRight: 8,
    },

    editButton: {
        marginRight: 12,
    },

    messageInput: {
        color: Color.Text,
        backgroundColor: Color.DarkContainer,
        borderRadius: 8,
        padding: 8,
    },

    swipesItem: {
        flexDirection: 'row',
        marginVertical: 8,
        marginHorizontal: 8,
    },

    swipeText: {
        color: Color.Text,
    },

    swipeTextContainer: {
        alignItems: 'center',
        flex: 1,
    },

    graytext: {
        color: Color.Offwhite,
        paddingTop: 4,
    },
})

const speechStyle = { color: Color.TextQuote }
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
