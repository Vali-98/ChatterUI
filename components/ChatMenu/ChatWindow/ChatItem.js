import {
    View, Text, StyleSheet, Image, Animated, Easing, 
} from 'react-native'
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler'
import { useRef, useEffect, useState, useContext} from 'react'
import { MaterialIcons} from '@expo/vector-icons'
import { MessageContext, saveChatFile, Global, getCharacterImageDirectory } from '@globals'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'
import Markdown from 'react-native-easy-markdown'
import * as FS from 'expo-file-system'
// global chat property for editing

const ChatItem = ({ message, id}) => {
    // fade in anim
    const fadeAnim = useRef(new Animated.Value(0)).current
    const dyAnim = useRef(new Animated.Value(50)).current
    const [messages, setMessages] = useContext(MessageContext)
    const [placeholderText, setPlaceholderText] = useState(message.mes)
    const [editMode, setEditMode] = useState(false)
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    // figure this shit out
    const [imageExists, setImageExists] = useState(true)


    useEffect(() => {
        FS.readAsStringAsync(getCharacterImageDirectory()).then(
            () => setImageExists(true)
        ).catch(
            () => setImageExists(false)
        )
    })

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
                ...styles.otherMessage,
            }}
        >
            <View style={styles.chatItem}>

            
                <Image style={styles.avatar} source={
                    (message.name === charName)?
                    ((imageExists)? {uri:getCharacterImageDirectory(message.name)} : require('@assets/user.png'))
                    :
                    require('@assets/user.png')
                    } />
            
            
            <View style={{flex:1}}>

                <View style={{flexDirection:'row', alignItems:'flex-end', marginBottom: 8}}>
                <Text style={{fontSize: 16,}}>{message.name}   </Text>
                <Text style={{fontSize: 10, flex: 1}}>{message.send_date}</Text>

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
                            <MaterialIcons name='delete' size={28} color="#707070" />
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
                            <MaterialIcons name='check' size={28} color="#707070" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.editButton} onPress={() => {
                            
                            // update content of file THEN => 
                            setPlaceholderText(message.mes)
                            setEditMode(editMode => false)
                            }}>
                            <MaterialIcons name='close' size={28} color="#707070" />
                        </TouchableOpacity>
                    </View>)
                    : 
                    (<View >
                        <TouchableOpacity style={styles.editButton} onPress={() => {
                            setEditMode(true)
                            setPlaceholderText(message.mes)
                            }}>
                            <MaterialIcons name='edit' size={28} color="#707070" />
                        </TouchableOpacity>
                    </View>)
                }
                
            </View>

            {!editMode?
                <View style={styles.messageTextContainer}>
                    <Markdown 
                        style={styles.messageText}
                        markdownStyles={{
                            em:{
                                color: `#606060`,
                                fontStyle:'italic',
                            }
                        }}
                    >
                    {message.mes.trim(`\n`)}
                    </Markdown>
                </View>
                :
                <View style={styles.messageInput}  >
                <TextInput
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
            
        </Animated.View>

    );

}

export { ChatItem }

const styles = StyleSheet.create({
    chatItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingBottom: 8,
        marginTop:6,
        marginRight: 8,
        borderColor: '#ddd',
        borderBottomWidth: 1,
    },

    userMessage: {
        justifyContent: 'flex-end',
    },
 
    otherMessage: {
        justifyContent: 'flex-start',
        
    },

    messageText: {
        textAlignVertical:'top',
    },

    messageTextContainer : {
        backgroundColor: '#e1e1e1',
        padding: 8,
        borderRadius: 8,
        flex: 1,
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
        marginRight:2,
    },

    messageInput : {
        backgroundColor:'#dfdfdf',
        borderRadius: 8,
        borderColor: '#333',
        borderWidth:1,
        padding:8,
        
    }
});