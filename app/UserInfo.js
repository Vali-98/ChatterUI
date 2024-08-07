import { SafeAreaView, View, Text, Image, TouchableOpacity, StyleSheet, TextInput } from 'react-native'
import React from 'react'
import { Stack, useRouter } from 'expo-router'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'
import { Global, getUserImageDirectory, saveUserCard, copyUserImage } from '@globals'
import { FontAwesome  } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'

const UserInfo = () => {
    const router = useRouter()
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const [userCard, setUserCard] = useMMKVObject(Global.CurrentUserCard)

    const saveCard = () => {
        saveUserCard(userName, userCard)
    }
    

    return (
    <SafeAreaView>
        <Stack.Screen
            options={{
                title: 'Edit User',
                animation: 'none'
            }}
        />

        <View style={styles.userContainer}> 
            <View style={styles.imageContainer}>    
                <Image style={styles.userImage} source={{uri:getUserImageDirectory(userName)}} />
            </View>
            <View>
                <Text style={styles.userName}>{userName}</Text>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={() => {
                        saveCard()
                        router.back()
                    }}>
                        <FontAwesome size={20} name='check'/>
                    </TouchableOpacity>
                    <TouchableOpacity  style={styles.button} 
                        onPress={() => {
                            DocumentPicker.getDocumentAsync({copyToCacheDirectory: true, type:'image/*'}).then((result) => {
                            if(result.canceled) return
                            copyUserImage(result.assets[0].uri, userName)
                        })
                    }}>
                        <FontAwesome size={20} name='upload' />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
        <View   style={styles.inputarea}>
            
        <Text>Description</Text>
        <TextInput 
            style={styles.input}
            multiline
            numberOfLines={3}
            value={userCard.description}
            onChangeText={text => {setUserCard({...userCard, description: text})}}
        />
        </View>

    </SafeAreaView>
    )
}

export default UserInfo


const styles = StyleSheet.create({
 
    userContainer: {
        flexDirection:'row',
        marginBottom: 40,
        margin: 16,
    },

    buttonContainer : {
        flexDirection: 'row',
        marginLeft: 12,
    },

    button: {
        marginRight: 10,
        borderWidth: 1,
        borderRadius: 4,
        padding: 8,
    },

    userName : {
        fontSize: 20,
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 12,
    },

    imageContainer : {
        width: 108,
        height: 108,
        borderRadius: 54,
        margin: 4,
        borderWidth: 1,
    },

    userImage : {
        width: 108,
        height: 108,
        borderRadius: 54,
    },

    inputarea: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },

    input: {
        borderWidth: 1,
        borderRadius: 8,
        textAlignVertical: 'top',
        paddingVertical:8,
      },

})