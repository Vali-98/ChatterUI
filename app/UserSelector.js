import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert } from 'react-native'
import { Stack } from 'expo-router'
import { ScrollView } from 'react-native-gesture-handler'
import { useState } from 'react'
import { useEffect } from 'react'
import { getUserFilenames, getUserImageDirectory, Global, createNewUser, loadUserCard, deleteUser } from '@globals'
import { useMMKVString } from 'react-native-mmkv'
import { FontAwesome, MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ToastAndroid } from 'react-native'

const UserSelector = () => {
    const router = useRouter()
    const [userList, setUserList] = useState([])
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const [userCard, setUserCard] = useMMKVString(Global.CurrentUserCard)
    const [showNewUser, setShowNewUser] = useState(false)
    const [newUserName, setNewUserName] = useState('')

    const loadUserList = () => {

        getUserFilenames().then((response)=> {
            if(response.length === 0) {
                const defaultName = 'User'
                createNewUser(defaultName).then(() => {
                    setUserList(response)
                    setUserName(defaultName)
                    loadUserCard(defaultName).then(card => setUserCard(card))
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
                headerRight: () => {
                    return (<View>
                        <TouchableOpacity onPress={() => {
                            setShowNewUser(true)
                        }}>
                            <FontAwesome size={28} name='plus'/>
                        </TouchableOpacity>
                    </View>)
                }
            }}
        />
       
        
        <ScrollView>
            {
                userList.map((name, index) => 
                    (<View key={index} style={styles.useritem}>
                        <TouchableOpacity 
                            style={styles.useritembutton}
                            onPress={() => {
                                loadUserCard(name).then((file) => {
                                    setUserCard(file)
                                    setUserName(name)
                                    router.back()
                                })
                            }}
                        >

                            <Image source={{uri:getUserImageDirectory(name)}} loadingIndicatorSource={require('@assets/user.png')} style={styles.avatar}/>
                        
                            <Text style={{flex:1}}>{name}</Text>
                        
                            <TouchableOpacity onPress={()=>{
                                Alert.alert(`Delete Persona`, `Are you sure you want to delete \'${name}\'?`, 
                                [
                                    {text:`Cancel`, style: `cancel`},
                                    {
                                        text:`Confirm`, 
                                        style: `destructive`, 
                                        onPress: () =>  deleteUser(name).then(() => { loadUserList()})
                                    }
                                ])
                                
                            }}>
                                <FontAwesome size={28} name='trash'/>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>))
            }
        </ScrollView>

        <Modal
                visible={showNewUser}
                transparent
                animationType='fade'
                onDismiss={() => {setShowNewUser(false)}}
            >   
                <View style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', flex:1, justifyContent: 'center'}}>
                <View style={styles.modalview}>
                    <Text>Enter Name</Text>
                    <TextInput 
                        style={styles.input} 
                        value={newUserName}
                        onChangeText={setNewUserName}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.modalButton}
                            onPress={() => setShowNewUser(false)
                        }>
                            <MaterialIcons name='close' size={28} color="#707070" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.modalButton}
                            onPress={() => {
                            if(userList.includes(newUserName)) {
                                ToastAndroid.show(`Persona already exists.`, ToastAndroid.SHORT)
                                return
                            }
                            createNewUser(newUserName).then(() => {
                                loadUserCard(newUserName).then(() => {      
                                    setUserName(newUserName)
                                    router.back()
                                })
                            })
                            
                            setShowNewUser(false)
                        }}>
                           <MaterialIcons name='check' size={28} color="#707070" />
                        </TouchableOpacity>
                    </View>    
                    
                </View>
                </View>
        </Modal>
    </SafeAreaView>
    )
}

export default UserSelector


const styles = StyleSheet.create({
    
    mainContainer: {
        marginVertical: 12, 
        marginHorizontal: 8,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginRight: 8,
    },

    username: {
        marginLeft: 8, 
    },

    useritem : {
        marginBottom: 8,
    },

    useritembutton: {
        flex:1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth:1,
        borderColor: '#000',
        borderRadius: 8,
        padding: 8,
    },


    modalview: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
        width: 0,
        height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },

    buttonContainer : {
        flexDirection: 'row',
        alignContent: 'space-around',
    },
    
    modalButton : {
        marginHorizontal: 30,
    },

    input: {
        minWidth: 200,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 8,
        margin: 8,
	},
})