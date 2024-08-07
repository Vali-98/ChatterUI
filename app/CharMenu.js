import {
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Text,
    Image,
    StyleSheet,
    View,
    Modal,
    ToastAndroid,
} from 'react-native'
import { useEffect, useState } from 'react'
import {useRouter} from 'expo-router'
import * as FS from 'expo-file-system'
import { useMMKVString } from 'react-native-mmkv'
import { Global, copyCharImage, createNewCharacter, createNewDefaultChat, saveCharacterCard } from '@globals'
import { TextInput } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { FontAwesome, MaterialIcons} from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import  extractChunks  from 'png-chunks-extract'
import { decode } from 'png-chunk-text'
import { Buffer } from '@craftzdog/react-native-buffer'
import * as Base64 from 'base-64'
import axios from 'axios'

const CharMenu = () => {
    const router = useRouter()
    const [characterList, setCharacterList] = useState([])
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [showNewChar, setShowNewChar] = useState(false)
    const [newCharName, setNewCharName] = useState('')
    const [showDownload, setShowDownload] = useState(false)
    const [downloadName, setDownloadName] = useState('')

    const getCharacterList = async () => {
        await FS.readDirectoryAsync(FS.documentDirectory + 'characters/').then((response) => {
            setCharacterList(response)
        }).catch(error => console.log(`Could not retrieve characters.\n${error}`))
    }

    useEffect(() => {
        getCharacterList()
    },[])

    const createCharacter = (uri) => {
        FS.readAsStringAsync(uri, {encoding: FS.EncodingType.Base64}).then((file)=>{
            const chunks = extractChunks(Buffer.from(file, 'base64'))
            const textChunks = chunks.filter(function (chunk) {
                return chunk.name === 'tEXt'
                }).map(function (chunk) {
                return decode(chunk.data)
                })
            const charactercard = JSON.parse(Base64.decode(textChunks[0].text))
            const newname = charactercard?.data?.name ?? charactercard.name
            console.log(`Creating new character: ${newname}`)
            if(newname === 'Detailed Example Character'){
                ToastAndroid.show('Invalid Character ID', 2000)
                return
            }
            createNewCharacter(newname).then(() => {
                return saveCharacterCard(newname, JSON.stringify(charactercard))
            }).then(() => {
                return copyCharImage(uri, newname)
            }).then(() => {
                return 
            }).then(() => {
                ToastAndroid.show(`Successfully Imported Character`, ToastAndroid.SHORT)
                getCharacterList()
            }).catch(() => {
                ToastAndroid.show(`Failed to create card - Character might already exist.`, 2000)
            })
        }).catch(error => {
            ToastAndroid.show(`Failed to create card - Character might already exist?`, 2000)
            console.log(error)
        })

    }


    return (

        <SafeAreaView>
            <Stack.Screen options={{headerRight : () => 
            (<View style={styles.headerButtonContainer}>
                
                <TouchableOpacity style={styles.headerButtonRight} onPress={async () => {
                    setShowDownload(true)
                }}>
                <FontAwesome name='cloud-download' size={28} />
                </TouchableOpacity>

               <TouchableOpacity style={styles.headerButtonRight} onPress={() => {
                    DocumentPicker.getDocumentAsync({copyToCacheDirectory: true, type:'image/*'}).then((result) => {
                        if(result.canceled) return
                        createCharacter(result.assets[0].uri)
                      })
               }}>
               <FontAwesome name='upload' size={28} />
               </TouchableOpacity>

               <TouchableOpacity style={styles.headerButtonRight} onPress={async () => {
                   setShowNewChar(true)
               }}>
               <FontAwesome name='plus' size={28} />
               </TouchableOpacity>


           </View>),}} />
           
            <Modal
                visible={showNewChar}
                transparent
                animationType='fade'
                onDismiss={() => {setShowNewChar(false)}}
            >   
                <View style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', flex:1, justifyContent: 'center'}}>
                <View style={styles.modalview}>
                    <Text>Enter Name</Text>
                    <TextInput 
                        style={styles.input} 
                        value={newCharName}
                        onChangeText={setNewCharName}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.modalButton}
                            onPress={() => setShowNewChar(false)
                        }>
                            <MaterialIcons name='close' size={28} color="#707070" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.modalButton}
                            onPress={() => {
                            createNewCharacter(newCharName).then(() => {
                                setCharName(newCharName)
                                router.push('CharInfo')
                                getCharacterList()
                            })
                            
                            setShowNewChar(false)
                        }}>
                           <MaterialIcons name='check' size={28} color="#707070" />
                        </TouchableOpacity>
                    </View>    
                    
                </View>
                </View>
            </Modal>
            
            <Modal
                visible={showDownload}
                transparent
                animationType='fade'
                onDismiss={() => {setShowDownload(false)}}
            >   
                <View style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', flex:1, justifyContent: 'center'}}>
                <View style={styles.modalview}>
                    <Text>Enter ID or Hyperlink</Text>
                    <TextInput 
                        style={styles.input} 
                        value={downloadName}
                        onChangeText={setDownloadName}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.modalButton}
                            onPress={() => setShowDownload(false)
                        }>
                            <MaterialIcons name='close' size={28} color="#707070" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.modalButton}
                            onPress={async () => {
                                console.log(downloadName)
                            axios.post(
                                'https://api.chub.ai/api/characters/download', 
                                {
                                    "format" : "tavern",
                                    "fullPath" : downloadName
                                },
                                {
                                    responseType: 'arraybuffer'
                                }
                                ).then(async (res) => {
                                    if(res.status !== 200){
                                        ToastAndroid.show(`Invalid URL`, ToastAndroid.SHORT)
                                        return
                                    }
                                    const response = Buffer.from(res.data, 'base64').toString('base64')
                                    
                                    FS.writeAsStringAsync(
                                        `${FS.cacheDirectory}image.png`, 
                                        response, 
                                        {encoding:FS.EncodingType.Base64}).then( async () => {
                                            createCharacter(`${FS.cacheDirectory}image.png`)
                                    })
                                    
                                })
                            setShowDownload(false)
                        }}>
                           <MaterialIcons name='check' size={28} color="#707070" />
                        </TouchableOpacity>
                    </View>    
                    
                </View>
                </View>
            </Modal>
            
            <ScrollView style={styles.characterContainer}>         
                {characterList.map((character,index) => (                
                    <TouchableOpacity
                        style={styles.longButton}
                        key={index}
                        onPress={() => {
                            setCharName(character)
                            router.back()
                        }}>   
                        <Image
                            source={{ uri: `${FS.documentDirectory}characters/${character}/${character}.png` }} 
                            style={styles.avatar}
                        />     
                        <Text style={styles.nametag}>{character}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    )
}

export default CharMenu

const styles = StyleSheet.create({
    characterContainer: {
        margin:8,
    },

    longButton: {
        backgroundColor:'#e1e1e1',
        flexDirection:'row',
        padding: 8,
        borderRadius:8,
        alignItems: 'center',
        borderColor: '#cccccc',
        borderWidth: 1,
    },

    avatar : {
        width: 48,
        height:48,
        borderRadius: 24,
        margin:4,
    },

    nametag : {
        fontSize:16,
        marginLeft: 20
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

    headerButtonRight : {
        marginLeft:20,
        marginRight:4,
    },

    headerButtonContainer : {
        flexDirection: 'row',
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