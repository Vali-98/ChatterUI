import {
    View, Text, StyleSheet, Image, Animated, Easing, 
} from 'react-native'
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler'
import { useRef, useEffect, useState, useContext} from 'react'
import { AntDesign, MaterialIcons} from '@expo/vector-icons'
import {  Global, Color, MessageContext, saveChatFile, getCharacterImageDirectory, getUserImageDirectory, humanizedISO8601DateTime } from '@globals'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'
import SimpleMarkdown from 'simple-markdown'
import Markdown from 'react-native-markdown-package'
import * as FS from 'expo-file-system'
import React from 'react'
// global chat property for editing

const ChatItem = ({ message, id, scroll}) => {
    // fade in anim
    const fadeAnim = useRef(new Animated.Value(0)).current
    const dyAnim = useRef(new Animated.Value(50)).current
    
    // globals
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    
    // drilled
    const [messages, setMessages, setTargetLength, setChatCache] = useContext(MessageContext)
    
    // local
    const [placeholderText, setPlaceholderText] = useState(message.mes)
    const [editMode, setEditMode] = useState(false)
    // figure this  out
    const [imageExists, setImageExists] = useState(true)


    useEffect(() => {
        FS.readAsStringAsync((message.name === charName) ? getCharacterImageDirectory(charName) : getUserImageDirectory(userName)).then(
            () => setImageExists(true)
        ).catch(
            () => setImageExists(false)
        )
        setPlaceholderText(messages.at(id + 1).mes)
    }, [message])
 

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
    }, [fadeAnim])

    // logic for multi part chat content if swipe exists
    // note, swipes: [mes1, mes2] swipe_no: 1
    // Note: Show edit buttons if global prop is inactive
    return (

        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: dyAnim }],
            }}
        >
            <View style={styles.chatItem}>

            
                <Image style={styles.avatar} source={
                    (message.name === charName)?
                    ((imageExists)? {uri:getCharacterImageDirectory(charName)} : require('@assets/user.png'))
                    :
                    ((imageExists)? {uri:getUserImageDirectory(userName)} : require('@assets/user.png'))
                    } />
            
            
            <View style={{flex:1}}>

            <View style={{flexDirection:'row', alignItems:'flex-end', marginBottom: 8}}>
                <Text style={{fontSize: 16, color: Color.Text}}>{message.name}   </Text>
                <Text style={{fontSize: 10, color: Color.Text, flex: 1}}>{message.send_date}</Text>

                { 
                (!nowGenerating) &&
                (editMode) ? 
                    (<View style={{flexDirection:'row'}} >
                        {id !== 0 && <TouchableOpacity style= {styles.editButton} onPress={() => {
                            setMessages(messages => {
                                let newmessages = messages.slice()
                                newmessages.splice(id + 1, 1)
                                saveChatFile(newmessages)
                                return newmessages
                            })
                            setEditMode(editMode => false)
                        }}>
                            <MaterialIcons name='delete' size={28} color={Color.Button} />
                        </TouchableOpacity>}

                        <TouchableOpacity style={styles.editButton} onPress={() => {
                            // update content of file THEN => 
                            setMessages(messages => {
                                let newmessages = messages

                                newmessages.at(id + 1).mes = placeholderText
                                if(newmessages.swipes !== undefined)
                                    newmessages.at(id + 1).swipes[newmessages.at(id + 1).swipe_id] = placeholderText
                                saveChatFile(newmessages)
                                return newmessages
                            })
                            setEditMode(editMode => false)
                            }}>
                            <MaterialIcons name='check' size={28} color={Color.Button} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.editButton} onPress={() => {
                            
                            // update content of file THEN => 
                            setPlaceholderText(message.mes)
                            setEditMode(editMode => false)
                            }}>
                            <MaterialIcons name='close' size={28} color={Color.Button} /> 
                        </TouchableOpacity>
                    </View>)
                    : 
                    (<View >
                        <TouchableOpacity style={styles.editButton} onPress={() => {
                            setEditMode(true)
                            setPlaceholderText(messages.at(id + 1).mes)
                            }}>
                            <MaterialIcons name='edit' size={28} color={Color.Button} />
                        </TouchableOpacity>
                    </View>)
                }
                
            </View>

            {!editMode?
                <View style={styles.messageTextContainer}>
                    <Markdown
                        style={styles.messageText}
                        styles={{
                            em:{
                                color: Color.TextItalic,
                                fontStyle:'italic',
                            },
                            text: {
                                color: Color.Text
                            },
                        }}
                        rules={{speech}}
                        
                    >
                    {message.mes.trim(`\n`)}
                    </Markdown>
                </View>
                :
                <View style={styles.messageInput} >
                <TextInput
                    style ={{color:Color.Text}}
                    value={placeholderText.trim('\n')} 
                    onChangeText={setPlaceholderText}        
                    textBreakStrategy='simple'
                    multiline
                    autoFocus
                />
                </View>
            }
            </View>
            </View>
            
            {(id === messages?.length - 2) 
                && id !== 0 // remove once alternatives added 
                && message.name === messages[0].character_name 
                && <View style={styles.swipesItem}>
                {!nowGenerating &&
                <TouchableOpacity onPress={() => {
                    // go previous if not first
                    if(message.swipe_id === 0) return
                    setMessages(messages => {
                        let newmessages = messages
                        let swipeid = messages.at(id + 1).swipe_id
                        newmessages.at(id + 1).mes = message.swipes.at(swipeid - 1)
                        newmessages.at(id + 1).swipe_id = swipeid - 1
                        saveChatFile(newmessages)
                        return newmessages
                    })
                    setPlaceholderText(message.swipes.at(message.swipe_id  - 1))
                    scroll.current?.scrollToEnd()
                }}>
                    <AntDesign name='left' size={20} color={Color.Button} />
                </TouchableOpacity>}
                <View style={styles.swipeTextContainer}>
                    <Text style={styles.swipeText}>
                    {message.swipe_id + 1} / {message.swipes.length}
                    </Text>
                </View>

                {!nowGenerating &&
                <TouchableOpacity onPress={() => {
                    
                    if(message.swipe_id < messages.at(id + 1).swipes.length - 1){
                        setMessages(messages => {
                            let newmessages = messages
                            let swipeid = messages.at(id + 1).swipe_id
                            newmessages.at(id + 1).mes = messages.at(id + 1).swipes.at(swipeid + 1)
                            newmessages.at(id + 1).swipe_id = swipeid + 1
                            saveChatFile(newmessages)
                            return newmessages
                        })
                        setPlaceholderText(message.swipes.at(message.swipe_id + 1))
                        scroll.current?.scrollToEnd()
                        return
                    }
                    
                    setMessages( (messages) => {
                        let newmessages = messages
                        newmessages.at(id + 1).mes = ""
                        newmessages.at(id + 1).swipes.push(``)
                        newmessages.at(id + 1).swipe_info.push(
                        {
                            "send_date":humanizedISO8601DateTime(),
                            "gen_started":humanizedISO8601DateTime(),
                            "gen_finished":"",
                            "extra":{"api":"kobold","model":"concedo/koboldcpp"}
                        })
                        newmessages.at(id + 1).swipe_id = newmessages.at(id + 1).swipe_id + 1
                        saveChatFile(newmessages).then(() => {
                            setChatCache(``)
                            setTargetLength(messages.length)
                            setNowGenerating(true)
                        })
                        return newmessages
                    })
                    
                }}>
                    <AntDesign name='right' size={20} color={Color.Button} />
                </TouchableOpacity>}
                </View>}

        </Animated.View>

    );

}

export { ChatItem }

const styles = StyleSheet.create({
    chatItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderColor: Color.Offwhite,
        borderBottomWidth: 1,
    },

    messageText: {
        textAlignVertical:'top',
    },

    messageTextContainer : {
        backgroundColor: Color.Container,
        paddingHorizontal: 8,
        borderRadius: 8,
        textAlignVertical:'center',
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginBottom:4,
        marginLeft: 4, 
        marginRight: 8, 
    },

    editButton : {
        marginRight:12,
    },

    messageInput : {
        color: Color.Text,
        backgroundColor:Color.DarkContainer,
        borderRadius: 8,
        padding:8,
    },

    swipesItem : {
        flexDirection: 'row', 
        marginVertical: 8, 
        marginHorizontal: 8,
    },

    swipeText: {
        color: Color.Text,
    },

    swipeTextContainer : {
        alignItems: 'center',
        flex:1,
    }
});

const speechStyle = {color: Color.TextQuote}
const speech = {
      order: SimpleMarkdown.defaultRules.em.order - 0.6,
      match: function(source, state, lookbehind) {
          return /^"([\s\S]+?)"(?!")/.exec(source);
      },
      parse: function(capture, parse, state) {
          return {
              content: parse(capture[1], state),
          };
      },
      react: function (node, output, {...state}) {
        state.withinText = true;
        state.style = {
          ...(state.style || {}),
          ...speechStyle
        };
        return React.createElement(Text, {
          key: state.key,
          style: speechStyle,
        }, `\"`, output(node.content, state), `\"`);
      },
      html: undefined
  }