import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Stack, useRouter} from 'expo-router'
import { TouchableOpacity, View, StyleSheet} from 'react-native'
import { useEffect } from 'react'
import { useMMKVString, useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'
import { Global, generateDefaultDirectories, createNewDefaultChat, createDefaultPresets,
    loadUserCard, createNewUser,  writeInstruct, Color, 
    defaultInstruct, defaultPresetKAI, defaultPresetTGWUI, defaultPresetNovelAI,
} from '@globals'
import { MenuProvider } from 'react-native-popup-menu';
import * as SystemUI from 'expo-system-ui'

import * as FS from 'expo-file-system'



// init values should be here
const Layout = () => {
    const router = useRouter()
    
	const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
	const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
    const [userCard, setUserCard] = useMMKVObject(Global.CurrentUserCard)

    const [instructName, setInstructName] = useMMKVObject(Global.InstructName)
    const [currentInstruct, setCurrentInstruct] = useMMKVObject(Global.CurrentInstruct)
    
    const [presetKAI, setPresetKAI] = useMMKVObject(Global.PresetKAI)
    const [presetNameKAI, setPresetNameKAI] = useMMKVString(Global.PresetNameKAI)

    const [presetTGWUI, setPresetTGWUI] = useMMKVObject(Global.PresetTGWUI)
    const [presetNameTGWUI, setPresetNameTGWUI] = useMMKVString(Global.PresetNameTGWUI)

    const [presetNovelAI, setPresetNovelAI] = useMMKVObject(Global.PresetNovelAI)
    const [presetNameNovelAI, setPresetNameNovelAI] = useMMKVObject(Global.PresetNameNovelAI)

    const [hordeModels, setHordeModels] = useMMKVObject(Global.HordeModels)
    const [hordeWorkers, setHordeWorkers] = useMMKVObject(Global.HordeWorkers)


    // reset defaults
    useEffect(() => {
		setCharName('Welcome')
		setCurrentChat('')
        setCurrentCard(null)
		setNowGenerating(false)
        setHordeWorkers([])
        setHordeModels([])
        
        console.log("Reset values")
        SystemUI.setBackgroundColorAsync(Color.Background)

        // replace this entire call with specific to each field
        
		FS.readDirectoryAsync(`${FS.documentDirectory}characters`).catch(() => generateDefaultDirectories().then(() => {
            
            createNewUser('User').then(() => {
                console.log(`Creating Default User`)
                loadUserCard('User').then(card => {
                    setUserName('User')
                    setUserCard(card)
                })
            })
            
            createDefaultPresets()
            setPresetKAI(defaultPresetKAI())
            setPresetNameKAI(`Default`)
            setPresetTGWUI(defaultPresetTGWUI())
            setPresetNameTGWUI(`Default`)
            setPresetNovelAI(defaultPresetNovelAI())
            setPresetNameNovelAI(`Default`)

            writeInstruct('Default', defaultInstruct()).then(() => {
                console.log(`Creating Default Instruct`)
                setCurrentInstruct(defaultInstruct())
                setInstructName(`Default`)
            })

        }).catch(
            (error) => console.log(`Could not generate default folders. Reason: ${error}`)
        ))
        
	}, []) 

    return (
        <MenuProvider>
    <Stack screenOptions={{
        headerStyle: {backgroundColor: Color.Header},
        headerTitleStyle: {color: Color.Text},
        headerTintColor: Color.White,
        contentStyle: {backgroundColor: Color.Background}
    }}>
       <Stack.Screen 
        name='index' 
        options={{         
            title: charName,
            headerRight : () => 
                    (<View style={styles.headerButtonContainer}>
                    {charName !== 'Welcome' && 
                    <View style={styles.headerButtonContainer}>
                        <TouchableOpacity style={styles.headerButtonRight} onPress={() => {router.push('ChatSelector')}}>
                            <Ionicons name='chatbox' size={28} color={Color.Button} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButtonRight} onPress={() => router.push(`CharInfo`)}>
                            <FontAwesome name='cog' size={28} color={Color.Button} />
                        </TouchableOpacity> 
                    </View>
                }
                    <TouchableOpacity style={styles.headerButtonRight} onPress={() => {router.push('CharMenu')}}>
                    <Ionicons name='person' size={28} color={Color.Button}/>
                    
                    </TouchableOpacity>
                    {false &&
                    <TouchableOpacity style={styles.headerButtonRight} onPress={() => generateDefaults()}>
                    <Ionicons name='reload' size={28} color={Color.Button}/>
                    </TouchableOpacity>}
                </View>)
            ,
            headerLeft :() =>  (
                <TouchableOpacity style={styles.headerButtonLeft} onPress={() => router.push('Settings')}>
                    <Ionicons name='menu' size={28} color={ Color.Button}/>
                </TouchableOpacity>
            ),
        }}/> 
                
       <Stack.Screen name='CharMenu' options={{
                        animation:'slide_from_right',
                         title: "Characters",
        }}/> 

        <Stack.Screen name='CharInfo' options={{
                animation:'slide_from_right',
                title: "Edit",
            
        }}/> 

        <Stack.Screen name='ChatSelector' options={{
                        animation:'slide_from_right',
                         title: "History", 
                         headerRight : () => 
                         (<View style={styles.headerButtonContainer}>
                            <TouchableOpacity style={styles.headerButtonRight} onPress={() => {
                                // create new default chat from globals
                                createNewDefaultChat(charName).then( response =>
                                    setCurrentChat(response)
                                )
                                router.back()
                            }}>
                                <FontAwesome name='plus' size={28} color={Color.Button} />
                            </TouchableOpacity>
                        </View>),
                         
        }}/> 
        
        <Stack.Screen   name='Settings' options={{
                        animation:'slide_from_left',
                        headerShown: 'false'
        }} />
    </Stack> 
    </MenuProvider>
    );
    
}

export default Layout;

const styles = StyleSheet.create({
    navbar : {
        alignItems:'center',
        paddingRight:100,
    },

    headerButtonRight : {
        marginLeft:20,
        marginRight:4,
    },

    headerButtonLeft : {
        marginRight:20,

    },

    headerButtonContainer : {
        flexDirection: 'row',
    },
})
