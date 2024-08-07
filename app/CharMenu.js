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
import { Color, Global, copyCharImage, createNewCharacter, saveCharacterCard } from '@globals'
import { Stack } from 'expo-router'
import { FontAwesome, MaterialIcons} from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import  extractChunks  from 'png-chunks-extract'
import { decode } from 'png-chunk-text'
import { Buffer } from '@craftzdog/react-native-buffer'
import * as Base64 from 'base-64'
import axios from 'axios'
import TextBoxModal from '@components/TextBoxModal'

const CharMenu = () => {
    const router = useRouter()
    const [characterList, setCharacterList] = useState([])
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [showNewChar, setShowNewChar] = useState(false)
    const [showDownload, setShowDownload] = useState(false)

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

        <SafeAreaView style={styles.mainContainer}>
            <Stack.Screen options={{headerRight : () => 
            (<View style={styles.headerButtonContainer}>
                
                <TouchableOpacity style={styles.headerButtonRight} onPress={async () => {
                    setShowDownload(true)
                }}>
                <FontAwesome name='cloud-download' size={28} color={Color.Button} />
                </TouchableOpacity>

               <TouchableOpacity style={styles.headerButtonRight} onPress={() => {
                    DocumentPicker.getDocumentAsync({copyToCacheDirectory: true, type:'image/*'}).then((result) => {
                        if(result.canceled) return
                        createCharacter(result.assets[0].uri)
                      })
               }}>
               <FontAwesome name='upload' size={28} color={Color.Button} />
               </TouchableOpacity>

               <TouchableOpacity style={styles.headerButtonRight} onPress={async () => {
                   setShowNewChar(true)
               }}>
               <FontAwesome name='pencil' size={28} color={Color.Button} />
               </TouchableOpacity>


           </View>),}} />
               
            <TextBoxModal 
                booleans={[showNewChar, setShowNewChar]}
                onConfirm={(text)=> {
                    createNewCharacter(text).then(() => {
                        setCharName(text)
                        router.push('CharInfo')
                        getCharacterList()
                    })
                }}
            />

            <TextBoxModal 
                booleans={[showDownload, setShowDownload]}
                onConfirm={(text)=> {
                    axios.post(
                        'https://api.chub.ai/api/characters/download', 
                        {
                            "format" : "tavern",
                            "fullPath" : text.replace('https://chub.ai/characters/', '')
                        },
                        {responseType: 'arraybuffer'}
                        ).then((res) => {
                            const response = Buffer.from(res.data, 'base64').toString('base64')
                            FS.writeAsStringAsync(
                                `${FS.cacheDirectory}image.png`, 
                                response, 
                                {encoding:FS.EncodingType.Base64}).then( async () => {
                                    createCharacter(`${FS.cacheDirectory}image.png`)
                            })
                            
                        }).catch((error) => {
                            console.log(`Could not retrieve card. ${error}`)
                            ToastAndroid.show(`Invalid ID or URL`, ToastAndroid.SHORT)
                        })
                }}
            />
            
            
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
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: Color.Background,
        flex: 1,
    },

    longButton: {
        backgroundColor:Color.Container,
        flexDirection:'row',
        padding: 12,
        borderRadius:8,
        alignItems: 'center',
        marginBottom: 8,
    },

    avatar : {
        width: 48,
        height:48,
        borderRadius: 24,
        margin:4,
    },

    nametag : {
        fontSize:16,
        marginLeft: 20,
        color: Color.White,
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