import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    Easing,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { useRef, useEffect, useState, useContext } from 'react';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import {
    Global,
    Color,
    MessageContext,
    Chats,
    Characters,
    Users,
    humanizedISO8601DateTime,
} from '@globals';
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv';
import SimpleMarkdown from 'simple-markdown';
import Markdown from 'react-native-markdown-package';
import * as FS from 'expo-file-system';
import React from 'react';
import TTSMenu from './TTS';
import AnimatedEllipsis from 'rn-animated-ellipsis';
// global chat property for editing

const ChatItem = ({ message, id, scroll }) => {
    // fade in anim
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const dyAnim = useRef(new Animated.Value(50)).current;

    // globals
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating);
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter);
    const [userName, setUserName] = useMMKVString(Global.CurrentUser);
    const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat);
    const [TTSenabled, setTTSenabled] = useMMKVBoolean(Global.TTSEnable);
    // drilled
    const [messages, setMessages, setTargetLength] = useContext(MessageContext);

    // local
    const [placeholderText, setPlaceholderText] = useState(message.mes);
    const [editMode, setEditMode] = useState(false);
    // figure this  out
    const [imageExists, setImageExists] = useState(true);

    useEffect(() => {
        FS.readAsStringAsync(
            message.name === charName
                ? Characters.getImageDir(charName)
                : Users.getImageDir(userName)
        )
            .then(() => setImageExists(true))
            .catch(() => setImageExists(false));
        setPlaceholderText(messages.at(id + 1).mes);
    }, [message]);

    useEffect(() => {
        setEditMode(false);
    }, [nowGenerating]);

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
        ]).start();
    }, [fadeAnim]);

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
    };

    let swapMessage = (n) => {
        let newmessages = Array.from(messages);

        const swipeid = message.swipe_id + n;
        newmessages.at(id + 1).mes = messages.at(id + 1).swipes.at(swipeid);
        newmessages.at(id + 1).extra = messages.at(id + 1).swipe_info.at(swipeid).extra;
        newmessages.at(id + 1).send_date = messages.at(id + 1).swipe_info.at(swipeid).send_date;
        newmessages.at(id + 1).gen_started = messages.at(id + 1).swipe_info.at(swipeid).gen_started;
        newmessages.at(id + 1).gen_finished = messages
            .at(id + 1)
            .swipe_info.at(swipeid).gen_finished;
        newmessages.at(id + 1).swipe_id = swipeid;
        Chats.saveFile(newmessages, charName, currentChat);
        setMessages(newmessages);
    };

    const generateSwipe = () => {
        let newmessages = messages;
        newmessages.at(id + 1).mes = '';
        newmessages.at(id + 1).swipes.push(``);
        newmessages.at(id + 1).swipe_info.push({
            send_date: humanizedISO8601DateTime(),
            gen_started: Date(),
            gen_finished: Date(),
            extra: { api: 'kobold', model: 'concedo/koboldcpp' },
        });
        newmessages.at(id + 1).send_date = humanizedISO8601DateTime();
        newmessages.at(id + 1).gen_started = Date();
        newmessages.at(id + 1).gen_finished = Date();
        newmessages.at(id + 1).swipe_id = newmessages.at(id + 1).swipe_id + 1;
        Chats.saveFile(newmessages, charName, currentChat).then(() => {
            setTargetLength(messages.length);
            setNowGenerating(true);
        });
        setMessages(newmessages);
    };

    const handleSwipe = (n) => {
        const swipeid = message.swipe_id + n;
        if (swipeid < 0) return;
        if (swipeid < message.swipes.length) {
            swapMessage(n);
            return;
        }
        if (id == 0) return;
        generateSwipe();
        scroll.current?.scrollToEnd();
    };

    const handleEditMessage = () => {
        setMessages((messages) => {
            let newmessages = messages;

            newmessages.at(id + 1).mes = placeholderText;
            if (newmessages.swipes !== undefined)
                newmessages.at(id + 1).swipes[newmessages.at(id + 1).swipe_id] = placeholderText;
            Chats.saveFile(newmessages, charName, currentChat);
            return newmessages;
        });
        setEditMode((editMode) => false);
    };

    const handleDeleteMessage = () => {
        setMessages((messages) => {
            let newmessages = messages.slice();
            newmessages.splice(id + 1, 1);
            Chats.saveFile(newmessages, charName, currentChat);
            return newmessages;
        });
        setEditMode((editMode) => false);
    };

    const handleEnableEdit = () => {
        setPlaceholderText(message.mes);
        setEditMode(!nowGenerating);
    };

    const handleDisableEdit = () => {
        setPlaceholderText(message.mes);
        setEditMode((editMode) => false);
    };

    const deltaTime = Math.max(
        0,
        ((new Date(message.gen_finished) - new Date(message.gen_started)) / 1000).toFixed(0)
    );

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
                        message.name == charName && message.mes == '' && nowGenerating ? (
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
                message?.swipes != undefined &&
                id != 0) ||
                (id === 0 && message?.swipes != undefined && message?.swipes?.length != 1)) && (
                <View style={styles.swipesItem}>
                    {!nowGenerating && (
                        <TouchableOpacity
                            onPress={() => {
                                handleSwipe(-1);
                            }}>
                            <AntDesign name="left" size={20} color={Color.Button} />
                        </TouchableOpacity>
                    )}
                    <View style={styles.swipeTextContainer}>
                        <Text style={styles.swipeText}>
                            {message.swipe_id + 1} / {message.swipes.length}
                        </Text>
                    </View>

                    {!nowGenerating && (
                        <TouchableOpacity
                            onPress={() => {
                                handleSwipe(1);
                            }}>
                            <AntDesign name="right" size={20} color={Color.Button} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </Animated.View>
    );
};

export { ChatItem };

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
});

const speechStyle = { color: Color.TextQuote };
const speech = {
    order: SimpleMarkdown.defaultRules.em.order + 0.6,
    match: function (source, state, lookbehind) {
        return /^"([\s\S]+?)"(?!")/.exec(source);
    },
    parse: function (capture, parse, state) {
        return {
            content: parse(capture[1], state),
        };
    },
    react: function (node, output, { ...state }) {
        state.withinText = true;
        state.style = {
            ...(state.style || {}),
            ...speechStyle,
        };
        return React.createElement(
            Text,
            {
                key: state.key,
                style: speechStyle,
            },
            `\"`,
            output(node.content, state),
            `\"`
        );
    },
    html: undefined,
};
