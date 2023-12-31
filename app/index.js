import {
	View, Text, TextInput,
	SafeAreaView, TouchableOpacity,
	StyleSheet
} from 'react-native'
import { useState, useEffect, useRef} from 'react'
import { ChatWindow }from '@components/ChatMenu/ChatWindow/ChatWindow' 
import { useMMKVString,  useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'
import { Global, Color, Chats, Characters, MessageContext } from '@globals'
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons'
import { Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu'
import { generateResponse } from '@lib/Inference'
import { Stack, useRouter } from 'expo-router'


const Home = () => {

	const router = useRouter()
	// User
	const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
	const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
	// Character
	const [userName, setUserName] = useMMKVString(Global.CurrentUser)
	const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
	// Process
	const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
	// Instruct
	const [currentInstruct, setCurrentInstruct] = useMMKVObject(Global.CurrentInstruct)
	// Local
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState('');
	// this target length allows for managing whether a message is replaced, added or swiped
	const [targetLength, setTargetLength] = useState(0)
	// dynamically set abort function that is set by respective API
	const [abortFunction, setAbortFunction] = useState(undefined)

	// load character chat upon character change, functionality might better be a dedicated function

	/*
		One big issue with state management is the old message passing, caused by
		very pre-global design using useContext. It may be more viable to somehow drill 
		proper functionality down to ChatItem and handle message states and character loading.
		
	*/

	useEffect(() => {
		if (charName === 'Welcome' || charName === undefined) return
		console.log(`Character changed to ${charName}`)
		Chats.getNewest(charName).then(
			filename => setCurrentChat(filename)
		)
		Characters.getCard(charName).then(data =>{
			setCurrentCard(JSON.parse(data))
		})
		
	}, [charName])
	
	// triggers generation when set true
	// TODO : Use this to save instead 
	useEffect(() => {
		nowGenerating && startInference()

		if(!nowGenerating && currentChat !== '' && charName !== 'Welcome' && messages.length !== 0) {
			console.log(`Saving chat`)
			Chats.saveFile(messages, charName, currentChat)
		}
	}, [nowGenerating])

	// load character upon currentChat changing - consider replacing for global messages
	useEffect(() => {	
		if(currentChat === '' || charName === 'Welcome' || charName === undefined) {
			return
		}
		console.log("Now reading " + currentChat + " for " + charName)
		Chats.getFile(charName, currentChat).then(newmessage => {
			setMessages(messages => newmessage)
		})		
	}, [currentChat])

	const startInference = async () => {
		setNewMessage(message => '')
		insertGeneratedMessage('')
		generateResponse(setAbortFunction, insertGeneratedMessage, messages)
	}

	const handleSend = () => {
		if (newMessage.trim() !== ''){	
			const newMessageItem = Chats.createEntry(userName, true, newMessage)		
			setMessages(messages => [...messages, newMessageItem])
			setTargetLength(messages.length + 2)
		} else 
			setTargetLength(messages.length + 1)
			
		setNowGenerating(true)
	}

	const insertGeneratedMessage = (data) => {
		setMessages(messages => {
			try {
				const createnew = (messages.length < targetLength)
				const mescontent = ((createnew )  ?  data : messages.at(-1).mes + data)
				.replaceAll(currentInstruct.input_sequence, ``)
				.replaceAll(currentInstruct.output_sequence, ``)
				const newmessage = (createnew) ? Chats.createEntry(charName, false, "") : messages.at(-1)
				newmessage.mes = mescontent
				newmessage.swipes[newmessage.swipe_id] = mescontent
				newmessage.gen_finished =  Date()
				newmessage.swipe_info[newmessage.swipe_id].gen_finished = Date()
				const finalized_messages = createnew ?	[...messages , newmessage] : [...messages.slice(0,-1), newmessage]
				return finalized_messages
			} catch (error) {
				console.log("Couldnt write due to:" + error)
				return messages 
			}
		})		
	}
	
	const abortResponse = () => {
		console.log(`Aborting Generation`)
		if(abortFunction !== undefined)
		abortFunction()
	}

	const regenerateResponse = () => {
		console.log('Regenerate Response')
		const len = messages.length
		if(messages.at(-1)?.name === charName){
			setMessages(messages.slice(0,-1))
			setTargetLength(len)
		} else setTargetLength(len+ 1)
		setNowGenerating(true)
	}

	const continueResponse = () => {
		console.log(`Continuing Reponse`)
		setTargetLength(messages.length + (messages.at(-1).name === charName)? 0 : 1)
		if(messages.at(-1).name === charName) {
			setTargetLength(messages.length)
		} else setTargetLength(messages.length + 1)
		setNowGenerating(true)
	}

	const menuoptions = [
		{callback: abortResponse, text: "Stop", button: "stop"},
		{callback: continueResponse, text: "Continue", button: "arrow-forward"},
		{callback: regenerateResponse, text: "Regenerate", button: "reload"},
	]

	return (
		<SafeAreaView style={styles.safeArea}>
			
			<Stack.Screen options={{
				title: '',
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
				</View>)
			,
			headerLeft :() =>  (
				<TouchableOpacity style={styles.headerButtonLeft} onPress={() => router.push('Settings')}>
					<Ionicons name='menu' size={28} color={Color.Button}/>
				</TouchableOpacity>
			)}}/>


			{ (charName === 'Welcome') ?
			<View><Text style={styles.welcometext}> 
				Select A Character To Get Started!
			</Text></View>		
			:
			<MessageContext.Provider value={ [messages, setMessages, setTargetLength]}>
			<View style={styles.container}>			
				
				<ChatWindow messages={messages} />

				<View style={styles.inputContainer}>
				
				<Menu>
				<MenuTrigger >
					<MaterialIcons name='menu' style={styles.optionsButton} size={36} color={Color.Button} />
				</MenuTrigger>
					<MenuOptions customStyles={styles.optionMenu}>
						{menuoptions.map((item, index) => (
							<MenuOption key={index} onSelect={item.callback}>
							<View style={(index === menuoptions.length - 1)? styles.optionItemLast : styles.optionItem}>
								<Ionicons name={item.button} color={Color.Button} size={24}/>
								<Text style={styles.optionText} >{item.text}</Text>
							</View>
							</MenuOption>
						))}						
					</MenuOptions>
				</Menu>

				<TextInput
					style={styles.input}
					placeholder="Message..."
					placeholderTextColor={Color.Offwhite}
					value={newMessage}
					onChangeText={(text) => setNewMessage(text)}
					multiline={true}
				/>

				{ nowGenerating ?
				<TouchableOpacity style={styles.sendButton} onPress={abortResponse}>
					<MaterialIcons name='stop' color={Color.Button} size={30}/>
				</TouchableOpacity>
					:
				<TouchableOpacity style={styles.sendButton} onPress={handleSend}>
					<MaterialIcons name='send' color={Color.Button} size={30}/>
				</TouchableOpacity>
				}

				</View>
			</View>
			</MessageContext.Provider>
			}
			
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex:1,
	},
	safeArea: {
		flex: 1,
	},

	welcometext : {
		justifyContent: 'center',
		margin: 40,
		fontSize:20,
		color: Color.Text
	},

	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 8,
	},
	input: {
		color: Color.Text,
		backgroundColor: Color.DarkContainer,
		flex: 1,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 24,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},

	sendButton: {
		marginLeft: 8,
		padding: 8,
	},
	
	optionsButton: {
		marginRight: 4,
	},

	optionMenu : {
		optionsContainer: {
			backgroundColor: Color.DarkContainer,
			padding: 4,
			borderRadius: 8,
			borderColor: Color.Offwhite,
			borderWidth: 1,
		},
	},

	optionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingBottom: 8,
		borderBottomColor: Color.Offwhite,
		borderBottomWidth: 1,
	},
	optionItemLast: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	optionText : {
		color: Color.Text,
		marginLeft: 16,	
	},

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
});

export default Home;





