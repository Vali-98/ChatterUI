import { SafeAreaView, View, Text, Image, StyleSheet } from 'react-native'
import { Global } from '@globals'
import React from 'react'
import { useMMKVString } from 'react-native-mmkv'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { FontAwesome } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

const Settings = () => {
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const router = useRouter()
    return (
        <SafeAreaView style={styles.mainContainer}>

        <View style={styles.userContainer}> 
            
            <Image style={styles.userImage} source={require('@assets/user.png')} />
            <View>
                <Text style={styles.userName}>{userName}</Text>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={() => {router.push('UserInfo')}}>
                        <FontAwesome size={20} name='edit'/>
                    </TouchableOpacity>
                    <TouchableOpacity  style={styles.button} onPress={() => {router.push('UserSelector')}}>
                        <FontAwesome size={20} name='th-list' />
                    </TouchableOpacity>
                </View>
            </View>

        </View>

        <View style={styles.largeButtonContainer}>
            <TouchableOpacity style={styles.largeButton} onPress={() => router.push("Presets")} >
                <Text style={styles.largeButtonText}>Presets</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.largeButton} onPress={() => router.push("Instruct")}>
                <Text style={styles.largeButtonText}>Instruct</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.largeButton} onPress={() => router.push("Endpoint")}>
                <Text style={styles.largeButtonText}>Endpoint</Text>
            </TouchableOpacity>
        </View>


        </SafeAreaView>
    )
}

export default Settings



const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    
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

    userImage : {
        width: 108,
        height: 108,
        borderRadius: 54,
        margin:4,
    },

    largeButtonContainer : {
        borderTopWidth:1,
        borderColor: '#888',
    },

    largeButtonText : {
        fontSize: 20,
        paddingVertical: 12,
        paddingLeft: 30
    },

    largeButton : {
        borderBottomWidth:1,
        fontSize: 20,
        borderColor: '#888',
    },

})