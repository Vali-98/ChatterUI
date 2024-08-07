import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert, ToastAndroid } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { ScrollView } from 'react-native-gesture-handler'
import { useState, useEffect } from 'react'
import { Global, Color, Users } from '@globals'
import { useMMKVString } from 'react-native-mmkv'
import { FontAwesome } from '@expo/vector-icons'

import  TextBoxModal  from '@components/TextBoxModal'

const UserSelector = () => {
    const router = useRouter()

    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const [userCard, setUserCard] = useMMKVString(Global.CurrentUserCard)
    const [userList, setUserList] = useState([])
    const [showNewUser, setShowNewUser] = useState(false)

    const loadUserList = () => {

        Users.getFileList().then((response)=> {
            if(response.length === 0) {
                const defaultName = 'User'
                Users.createUser(defaultName).then(() => {
                    setUserList(response)
                    setUserName(defaultName)
                    Users.loadFile(defaultName).then(card => setUserCard(card))
                    loadUserList()
                })
            }
            else setUserList(response)
        }).catch(() => setUserList([]))
    }

    useEffect(() => {if (userName !== undefined) loadUserList()}, [])

    return (
    <SafeAreaView style={styles.mainContainer}>
        <Stack.Screen
            options={{
                title:'Personas',
                animation: 'slide_from_left',
                headerRight: () => {
                    return (<View>
                        <TouchableOpacity onPress={() => {
                            setShowNewUser(true)
                        }}>
                            <FontAwesome size={28} name='plus' color={Color.Button}/>
                        </TouchableOpacity>
                    </View>)
                }
            }}
        />
       
        
        <ScrollView>
            {
                userList.map((name, index) => 
                    (<View key={index} style={(name===userName) ? {...styles.useritem, backgroundColor: Color.Container} :styles.useritem}>
                        <TouchableOpacity 
                            style={styles.useritembutton}
                            onPress={() => {
                                Users.loadFile(name).then((file) => {
                                    setUserCard(file)
                                    setUserName(name)
                                    router.back()
                                })
                            }}
                        >
                            <Image source={{uri:Users.getImageDir(name)}} loadingIndicatorSource={require('@assets/user.png')} style={styles.avatar}/>
                        
                            <Text style={{flex:1, color: Color.Text}}>{name}</Text>
                        
                            <TouchableOpacity onPress={()=>{
                                Alert.alert(`Delete Persona`, `Are you sure you want to delete \'${name}\'?`, 
                                [
                                    {text:`Cancel`, style: `cancel`},
                                    {
                                        text:`Confirm`, 
                                        style: `destructive`, 
                                        onPress: () =>  Users.deleteFile(name).then(() => { loadUserList()})
                                    }
                                ])
                                
                            }}>
                                <FontAwesome size={28} name='trash' color={Color.Button}/>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>))
            }
        </ScrollView>
        

        <TextBoxModal 
            booleans = {[showNewUser, setShowNewUser]}
            onConfirm = {(text)=>{
                if(userList.includes(text)) {
                    ToastAndroid.show(`Persona already exists.`, ToastAndroid.SHORT)
                    return
                }
                createNewUser(text).then(() => {
                    loadUserCard(text).then(() => {      
                        setUserName(text)
                        router.back()
                    })
                })
            }}
        />

    </SafeAreaView>
    )
}

export default UserSelector


const styles = StyleSheet.create({
    
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: Color.Background,
        flex: 1,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginRight: 8,
        borderRadius: 24,
    },

    username: {
        marginLeft: 8, 
    },

    useritem : {
        flex:1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: Color.DarkContainer,
    },

    useritembutton: {
        flex:1,
        flexDirection: 'row',
        alignItems: 'center',
    },

})