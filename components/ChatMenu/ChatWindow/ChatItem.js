import { AntDesign, MaterialIcons } from '@expo/vector-icons'
import { Global, Color, Chats, Characters, Users, Messages } from '@globals'
import * as FS from 'expo-file-system'
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
} from 'react-native'
import Markdown from 'react-native-markdown-package'
import { useMMKVBoolean, useMMKVObject, useMMKVString } from 'react-native-mmkv'
import AnimatedEllipsis from 'rn-animated-ellipsis'
import SimpleMarkdown from 'simple-markdown'

import TTSMenu from './TTS'
// global chat property for editing

const ChatItem = ({ message, id, scroll }) => {
    // fade in anim
    const fadeAnim = useRef(new Animated.Value(0)).current
    const dyAnim = useRef(new Animated.Value(50)).current

    // globals
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
    const [TTSenabled, setTTSenabled] = useMMKVBoolean(Global.TTSEnable)
    // drilled
    const [messages, setMessages] = useMMKVObject(Global.Messages)
    // local
    const [placeholderText, setPlaceholderText] = useState(message.mes)
    const [editMode, setEditMode] = useState(false)
    // figure this  out
    const [imageExists, setImageExists] = useState(true)

    useEffect(() => {
        FS.readAsStringAsync(
            message.name === charName
                ? Characters.getImageDir(charName)
                : Users.getImageDir(userName)
        )
            .then(() => setImageExists(true))
            .catch(() => setImageExists(false))
        setPlaceholderText(messages.at(id + 1).mes)
    }, [message])

    useEffect(() => {
        setEditMode(false)
    }, [nowGenerating])

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
    }, [fadeAnim])

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
        Messages.swipeLeft(id + 1)
    }

    const handleSwipeRight = () => {
        const atLimit = Messages.swipeRight(id + 1)
        console.log(atLimit)
        if (atLimit) {
            console.log(`at limit`)
            Messages.addSwipe(id + 1)
            setNowGenerating(true)
        }
    }

    const handleEditMessage = () => {
        const newmessages = Messages.updateEntry(id + 1, placeholderText)
        Chats.saveFile(newmessages, charName, currentChat)
        setEditMode(false)
    }

    const handleDeleteMessage = () => {
        const newmessages = Messages.deleteEntry(id + 1)
        Chats.saveFile(newmessages, charName, currentChat)
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
        ((new Date(message.gen_finished) - new Date(message.gen_started)) / 1000).toFixed(0)
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
                    ...(id === messages.length - 2
                        ? { borderBottomWidth: 1, borderColor: Color.Offwhite }
                        : {}),
                }}>
                <View style={{ alignItems: 'center' }}>
                    <Image
                        style={styles.avatar}
                        source={
                            message.name === charName
                                ? imageExists
                                    ? { uri: Characters.getImageDir(charName) }
                                    : require('@assets/user.png')
                                : imageExists
                                  ? { uri: Users.getImageDir(userName) }
                                  : require('@assets/user.png')
                        }
                    />
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

                    {!editMode ? (
                        message.name === charName && message.mes === '' && nowGenerating ? (
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
                                    {message.mes.trim(`\n`)}
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
                                autoFocus
                            />
                        </View>
                    )}
                </View>
            </View>

            {((id === messages?.length - 2 &&
                message.name === messages[0].character_name &&
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
    match(source, state, lookbehind) {
        return /^"([\s\S]+?)"(?!")/.exec(source)
    },
    parse(capture, parse, state) {
        return {
            content: parse(capture[1], state),
        }
    },
    react(node, output, { ...state }) {
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
