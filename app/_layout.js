import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Stack, useRouter} from 'expo-router'
import { TouchableOpacity, View, StyleSheet} from 'react-native'
import { useEffect } from 'react'
import { useMMKVString, useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'
import { Global, generateDefaultDirectories, createNewDefaultChat, 
    loadUserCard, createNewUser, writePreset,  writeInstruct, Color, resetEncryption
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
    const [currentPreset, setCurrentPreset] = useMMKVObject(Global.CurrentPreset)
	const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
    const [currentInstruct, setCurrentInstruct] = useMMKVObject(Global.CurrentInstruct)
    const [userCard, setUserCard] = useMMKVObject(Global.CurrentUserCard)

    const [instructName, setInstructName] = useMMKVObject(Global.InstructName)
    const [presetName, setPresetName] = useMMKVString(Global.PresetName)

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

		FS.readDirectoryAsync(`${FS.documentDirectory}characters`).catch(() => generateDefaultDirectories().then(() => {
            
            createNewUser('User').then(() => {
                console.log(`Creating Default User`)
                loadUserCard('User').then(card => {
                    setUserName('User')
                    setUserCard(card)
                })
            })
            
            writePreset(`Default`, defaultPreset()).then(() => {
                console.log(`Creating Default Presets`)
                setCurrentPreset(defaultPreset())
                setPresetName(`Default`)
            })
            
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

const defaultPreset = () => {
    return {
        "temp": 1,
        "rep_pen": 1,
        "rep_pen_range": 1,
        "top_p": 0.9,
        "top_a": 0.9,
        "top_k": 20,
        "typical": 1,
        "tfs": 1,
        "rep_pen_slope": 0.9,
        "single_line": false,
        "sampler_order": [
            6,
            0,
            1,
            3,
            4,
            2,
            5
        ],
        "mirostat": 0,
        "mirostat_tau": 5,
        "mirostat_eta": 0.1,
        "use_default_badwordsids": true,
        "grammar": "",
        "genamt": 220,
        "max_length": 4096
    }

}

const defaultInstruct = () => {
    return {
        "system_prompt": "Write {{char}}'s next reply in a roleplay chat between {{char}} and {{user}}.",
        "input_sequence": "### Instruction: ",
        "output_sequence": "### Response: ",
        "first_output_sequence": "",
        "last_output_sequence": "",
        "system_sequence_prefix": "",
        "system_sequence_suffix": "",
        "stop_sequence": "",
        "separator_sequence": "",
        "wrap": false,
        "macro": false,
        "names": false,
        "names_force_groups": false,
        "activation_regex": "",
        "name": "Default"
    }
}

