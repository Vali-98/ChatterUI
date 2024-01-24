import { ScrollView, View, Text, StyleSheet, Image ,Alert, ToastAndroid, TouchableOpacity } from 'react-native'
import { useEffect, useState } from 'react'
import { useMMKVString } from 'react-native-mmkv'
import { Global, Color, Chats, Characters, saveStringExternal}  from '@globals'
import { useRouter } from 'expo-router'
import { FontAwesome } from '@expo/vector-icons'
import { Stack } from 'expo-router'

const ChatSelector = () => {
    const router = useRouter()
    const [chats, setChats] = useState([])
    const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    
    useEffect(() => {
        refreshfilenames()
    },[])
    
    const refreshfilenames = () => {
        Chats.getFileList(charName).then(setChats)
    }

    const deleteChat = (chatname) => {
        Alert.alert(`Delete Chat`, `Are you sure you want to delete this chat file?`, [
            {
                text:'Cancel',
                onPress:()=> {},
                style:'cancel' 
            },
            {
                text:'Confirm',
                onPress: () => {
                    Chats.deleteFile(charName, chatname).then(() =>
                        Chats.getNewest(charName).then(filename => {
                            setCurrentChat(filename)    
                            refreshfilenames()
                }))},
                style:'destructive'
            }])

    }

    const exportChat = async (chatname) => {
        saveStringExternal(
            chatname,
            await Chats.getFile(charName, chatname),
            "application/*"
        ).catch((error) => {
            ToastAndroid.show(`Could not save file.`, 2000)
            console.log(error)
        })
    }

    return (
        <ScrollView style={styles.mainContainer}>

        <Stack.Screen options={{
                         headerRight : () => 
                         (<View style={styles.headerButtonContainer}>
                            <TouchableOpacity style={styles.headerButtonRight} onPress={() => {
                                // create new default chat from globals
                                Chats.createDefault(charName, userName).then( response =>
                                    setCurrentChat(response)
                                )
                                router.back()
                            }}>
                                <FontAwesome name='plus' size={28} color={Color.Button} />
                            </TouchableOpacity>
                        </View>),
                         
        }}/> 
        {
            chats.reverse().map((chat,index) => (
            <TouchableOpacity
                key={index}
                onPress={() => {
                    setCurrentChat(chat)
                    router.back()
                }}
                style = {chat === currentChat ? styles.selectedchatlogitem : styles.chatlogitem}
            >   
            
                <Image source={{uri:Characters.getImageDir(charName)}} style={styles.avatar}/>
                <Text style={styles.chatname}>{chat.replace('.jsonl', '')}</Text>
           
                <TouchableOpacity style={styles.button} onPress={() => exportChat(chat)}>
                    <FontAwesome name='download' size={32} color={Color.Button} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => deleteChat(chat)}>
                    <FontAwesome name='trash' size={32} color={Color.Button} />
                </TouchableOpacity>
            </TouchableOpacity>
        ))}
        </ScrollView>
    )
}

export default ChatSelector

const styles = StyleSheet.create({
    mainContainer: {
        paddingHorizontal: 16,
        backgroundColor: Color.Background,
    },

    chatname : {
        color: Color.Text,
        flex: 1,
    },

    chatlogitem: {
        flex:1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginVertical: 4,
        backgroundColor: Color.DarkContainer,
    },

    selectedchatlogitem: {
        flex:1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginVertical: 4,
        backgroundColor: Color.Container,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginRight: 8,
    },

    button : { 
        marginRight: 8,
        marginLeft: 16,
    }
})