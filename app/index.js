import {
	View, Text, TextInput,
	SafeAreaView, TouchableOpacity,
	StyleSheet,
	ToastAndroid,
	ActivityIndicator
} from 'react-native'
import { useState, useEffect} from 'react'
import {ChatWindow }from '@components/ChatMenu/ChatWindow/ChatWindow' 
import { useMMKVString,  useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'
import { Global, Color, getChatFile, getNewestChatFilename , MessageContext, saveChatFile, getCharacterCard, humanizedISO8601DateTime, createChatEntry} from '@globals'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu'
import { generateResponse } from '@lib/Inference'


const Home = () => {
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
	
	// api / adventure
	const [apiType, setApiType] = useMMKVString(Global.APIType)
	const [adventureMode, setAdventureMode] = useMMKVBoolean(Global.AdventureEnabled)
	// Local
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState('');
	const [targetLength, setTargetLength] = useState(0)
	const [abortFunction, setAbortFunction] = useState(undefined)


	// load character chat upon character change
	useEffect(() => {
		if (charName === 'Welcome' || charName === undefined) return
		console.log(`Character changed to ${charName}`)
		getNewestChatFilename(charName).then(
			filename => setCurrentChat(filename)
		)
		getCharacterCard().then(data =>{
			setCurrentCard(JSON.parse(data))
		})
		
	}, [charName])
	
	useEffect(() => {
		//setAdventureMode(false)
	}, [apiType])

	// triggers generation when set true
	// TODO : Use this to save instead 
	useEffect(() => {
		nowGenerating && startInference()
		if(!nowGenerating && currentChat !== '' && charName !== 'Welcome' && messages.length !== 0) {
			console.log(`Saving chat`)
			saveChatFile(messages, charName, currentChat)
		}
	}, [nowGenerating]) 

	// load character upon currentChat changing 
	useEffect(() => {	
		if(currentChat === '' || charName === 'Welcome' || charName === undefined) {
			return
		}
		console.log("Now reading " + currentChat + " for " + charName)
		getChatFile(charName, currentChat).then(newmessage => {
			setMessages(messages => newmessage)
		})		
	}, [currentChat])

	const startInference = () => {
		setNewMessage('')
		generateResponse(setAbortFunction, insertGeneratedMessage, messages)
	}

	const handleSend = (newMessage) => {
		if (newMessage.trim() !== ''){	
			const newMessageItem = createChatEntry(userName, true, newMessage)		
			setMessages(messages => [...messages, newMessageItem])
			setTargetLength(messages.length + 2)
		} else 
			setTargetLength(messages.length + 1)
		setNowGenerating(true)
	}

	const insertGeneratedMessage = (input_data) => {
		let data = ""
		let adventure_data = ""
		if(adventureMode) {
			const filtered = input_data.split("```")
			data = filtered[0]
			if(filtered.length > 1)
			adventure_data = filtered[1].split('\n').filter(item => {return item.startsWith(`[`)}).map(text => {return text.split(`] `)[1]}).join('||')
		} 
		else data = input_data

		setMessages(messages => {
			try {
				const createnew = (messages.length < targetLength)
				const mescontent = ((createnew )  ?  data : messages.at(-1).mes + data)
				.replaceAll(currentInstruct.input_sequence, ``)
				.replaceAll(currentInstruct.output_sequence, ``)
				let newmessage = {
					...((createnew) ? createChatEntry(charName, false, "") : messages.at(-1)),
					mes : mescontent,
					gen_finished:Date() ,
					adventure_options : adventure_data
				}
				newmessage.swipes[newmessage.swipe_id] = mescontent
				newmessage.swipe_info[newmessage.swipe_id].gen_finished = Date()
				newmessage.swipe_info[newmessage.swipe_id].adventure_options = adventure_data
				const finalized_messages = createnew ?	[...messages , newmessage] : [...messages.slice(0,-1), newmessage]
				return finalized_messages
			} catch (error) {
				console.log("Couldnt write due to:" + error)
				return messages 
			}
		})		
	}
	
	const getAdventureOptions = () => {
		if(messages.length === 0|| messages.at(-1).name !== charName || messages.at(-1)?.adventure_options === undefined) return []
		try {
			return messages.at(-1)?.adventure_options.split("||") ?? messages.at(-1)?.data?.adventure_options.split("||")
		} catch {
			ToastAndroid.show(`Something is wrong with Options formatting`, 2000)
			return []
		}
	}

	const abortResponse = () => {
		console.log(`Aborting Generation`)
		if(abortFunction !== undefined)
		abortFunction()
		setNowGenerating(false)
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
			
			{ (charName === 'Welcome') ?
			<View><Text style={styles.welcometext}> 
				Select A Character To Get Started!
			</Text></View>		
			:
			<MessageContext.Provider value={ [messages, setMessages, setTargetLength]}>
			<View style={styles.container}>			
				
				<ChatWindow messages={messages} />

				{(adventureMode) ?
				(nowGenerating ?
				<View style={styles.adventureInput}>
					<ActivityIndicator size="large" />
				</View>	
				:	
				(messages.at(-1).name === charName &&
					<View style={styles.adventureInput}>
					{(messages.at(-1)?.adventure_options !== undefined && messages.at(-1)?.adventure_options !== '') ?
					getAdventureOptions().map((text, index) => (
					<View key={index}> 
						<TouchableOpacity style={styles.adventureOptionContainer}
							onPress={() => {
								setNewMessage(text)
								setTargetLength(messages.length + 1)
								handleSend(text)
							}}
						>
							<Text style={{color: Color.Text}}>{text}</Text>
						</TouchableOpacity>
					</View>))
					:
					<View> 
						<TouchableOpacity style={styles.adventureOptionContainer}
							onPress={() => {
								setTargetLength(messages.length)
								setNowGenerating(true)
							}}
						>
							<Text style={{color: Color.Text}}>Generate Responses</Text>
						</TouchableOpacity>
					</View>
					}
				</View>))
				:
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
				<TouchableOpacity style={styles.sendButton} onPress={() => handleSend(newMessage)}>
					<MaterialIcons name='send' color={Color.Button} size={30}/>
				</TouchableOpacity>
				}

				</View>
				}
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

	adventureInput: {
		marginBottom: 8,
	},

	adventureOptionContainer: {
		marginHorizontal: 16, 
		marginVertical: 2,
		padding: 12,
		borderRadius: 16,
		backgroundColor: Color.DarkContainer,
		justifyContent: 'center',
	},
});

export default Home;





