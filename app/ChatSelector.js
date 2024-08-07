import { ScrollView, View, Text, StyleSheet, Image ,Alert } from 'react-native'
import { useEffect, useState } from 'react'
import { useMMKVString } from 'react-native-mmkv'
import { Global, Color, getCharacterImageDirectory, getChatFilenames, deleteChatFile, getNewestChatFilename}  from '@globals'
import { useRouter } from 'expo-router'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { FontAwesome } from '@expo/vector-icons'


const ChatSelector = () => {
    const router = useRouter()
    const [chats, setChats] = useState([])
    const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)


    const refreshfilenames = () => {
        getChatFilenames().then(
            chatdirs => {
                setChats(chatdirs)
            }
        )
    }


    useEffect(() => {
        refreshfilenames()
    },[])


    return (
        <ScrollView style={styles.mainContainer}>
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
                        <View style = {styles.chatinfo}>
                            
                            <Image source={{uri:getCharacterImageDirectory()}} style={styles.avatar}/>
                            <Text style={styles.chatname}>{chat.replace('.jsonl', '')}</Text>

                        </View>
                        
                            <TouchableOpacity style={styles.deleteIcon} onPress={() => {
                                Alert.alert(`Delete Chat`, `Are you sure you want to delete this chat file?`, [
                                    {
                                        text:'Cancel',
                                        onPress:()=> {},
                                        style:'cancel' 
                                    },
                                    {
                                        text:'Confirm',
                                        onPress: () => {
                                            deleteChatFile(charName, chat).then(() =>
                                                getNewestChatFilename(charName).then(filename => {
                                                    setCurrentChat(filename)    
                                                    refreshfilenames()
                                        }))},
                                        style:'destructive'
                                    }])}}>
                                <FontAwesome name='trash' size={32} color={Color.White} />
                            </TouchableOpacity>
                        </TouchableOpacity>
            ))}
        </ScrollView>
    )
}

export default ChatSelector

const styles = StyleSheet.create({
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: Color.Background,
        flex: 1,
    },

    chatname : {
        color: Color.White,
    },

    chatlogitem: {
        flex:1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: Color.DarkContainer,
    },

    selectedchatlogitem: {
        flex:1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: Color.Container,
    },


    chatinfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex:1,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginRight: 8,
    },

    deleteIcon : { 
        marginRight: 8,
    }
})