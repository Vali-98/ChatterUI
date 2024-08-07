import { ScrollView, View, Text, StyleSheet, Image ,Alert } from 'react-native'
import { useEffect, useState } from 'react'
import { useMMKVString } from 'react-native-mmkv'
import { Global, getCharacterImageDirectory, getChatFilenames, deleteChatFile, getNewestChatFilename, createNewDefaultChat }  from '@globals'
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
        
        <ScrollView styles = {styles.chatlogs}>
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
                            <Text>{chat}</Text>

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
                                <FontAwesome name='trash' size={32} />
                            </TouchableOpacity>
                        </TouchableOpacity>
            ))}
        </ScrollView>

    )
}

export default ChatSelector

const styles = StyleSheet.create({
    chatlogs: {
        flexDirection: 'column',
        flex: 1,
    },

    chatlogitem: {
        flex:1,
        flexDirection: 'row',
        alignContent:'flex-start',
        margin:4, 
        padding: 8,
        borderWidth:1,
        borderColor: '#000',
        borderRadius: 8,
    },

    selectedchatlogitem: {
        flex:1,
        flexDirection: 'row',
        alignContent:'flex-start',
        margin:4, 
        padding: 8,
        borderWidth:3,
        borderColor: '#ebe82f',
        borderRadius: 8,
    },


    chatinfo: {
        flexDirection: 'row',
        alignContent:'flex-start',
        flex:0.98,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginBottom:4,
        marginLeft: 4, 
        marginRight: 8, 
    },

    deleteIcon : { 
        flex:0.1, 
        paddingTop: 4,
    }
})