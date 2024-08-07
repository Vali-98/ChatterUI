import {
	View, Text, TextInput,
	SafeAreaView, TouchableOpacity,
	StyleSheet, ToastAndroid,
} from 'react-native'
import { useState, useEffect} from 'react'
import axios  from 'axios'
import ChatMenu from '@components/ChatMenu/ChatMenu' 
import { useMMKVString,  useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'
import { Global, Color, getChatFile,getNewestChatFilename , MessageContext, saveChatFile, getCharacterCard} from '@globals'
import llamaTokenizer from '@constants/tokenizer'
import { MaterialIcons } from '@expo/vector-icons'

const Home = () => {

	const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
	const [userName, setUserName] = useMMKVString(Global.CurrentUser)
	const [endpoint, setEndpoint] = useMMKVString(Global.Endpoint)
	const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
	const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
	const [userCard, setUserCard] = useMMKVObject(Global.CurrentUserCard)
	const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
	const [currentInstruct, setCurrentInstruct] = useMMKVObject(Global.CurrentInstruct)
	const [currentPreset, setCurrentPreset] = useMMKVObject(Global.CurrentPreset)

	// rework later
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState('');

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
			
	const constructPayload = () => {
		let payload = `${currentInstruct.input_sequence}\n${userCard.description}\n${currentInstruct.system_prompt}\n${currentCard.description}\n`
		let message_acc = ``
		for(const message of messages.slice(1)) {
			let message_shard = `${message.name === charName ? currentInstruct.output_sequence : currentInstruct.input_sequence} ${message.mes}\n`
			if (llamaTokenizer.encode(payload + message_acc).length > currentInstruct.max_length){
				//console.log(llamaTokenizer.encode(payload + message_acc).length > currentInstruct.max_length)
				break
			}
			message_acc += message_shard
		}
		payload += message_acc	
		return {
			"prompt": payload.replace(`{{char}}`, charName).replace(`{{user}}`,userName) + currentInstruct.output_sequence,
			"use_story": false,
			"use_memory": false,
			"use_authors_note": false,
			"use_world_info": false,
			"max_context_length": parseInt(currentPreset.max_length),
			"max_length": parseInt(currentPreset.genamt),
			"rep_pen": currentPreset.rep_pen,
			"rep_pen_range": parseInt(currentPreset.rep_pen_range),
			"rep_pen_slope": currentPreset.rep_pen_slope,
			"temperature": currentPreset.temp,
			"tfs": currentPreset.tfs,
			"top_a": currentPreset.top_a,
			"top_k": parseInt(currentPreset.top_k),
			"top_p": currentPreset.top_p,
			"typical": currentPreset.typical,
			"sampler_order": [6, 0, 1, 3, 4, 2, 5],
			"singleline": false,
			"sampler_seed": Math.floor(Math.random() * 1000000000),
			"sampler_full_determinism": false,
			"frmttriminc": true,
			"frmtrmblln": true,
			"stop_sequence": ["\n\n\n\n\n", currentInstruct.input_sequence],
		}
	}

	useEffect(() => {
		if(nowGenerating)
			generateResponse()
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

	const handleSend = () => {
		if (newMessage.trim() !== ''){	
			const newMessageItem = createChatEntry(userName, true, newMessage)		
			setMessages(messages => [...messages, newMessageItem])
		}
		setNowGenerating(true)
	};



	const generateResponse = () => {
		console.log(`Obtaining response from endpoint: ${endpoint}`)
		setNewMessage(n => '');
		console.log("Getting Response")
		// handle swipe logic
		const target_length = messages.length + 1
		const getresponse = (api, write = false, body = "") => {
			return axios.create({timeout:200}).post(api, body)
			.then(response => {
				// hacky solution, API returns json missing `}` occasionally
				let data = {}
				try{
					data = response.data.results[0].text
				} catch {
					data = JSON.parse(`${response.data}}`).results[0].text
				}
				setMessages(messages => {
					try {
						const createnew = (messages.length < target_length)	
						const mescontent = data
						.replace(currentInstruct.input_sequence, ``)
						.replace(currentInstruct.output_sequence, ``)
						.trim()
						const newmessage = (createnew) ? createChatEntry(charName, false, "") : messages.at(-1)
						newmessage.mes = mescontent
						newmessage.swipes[newmessage.swipe_id] = mescontent
						if (write) {  // if this is the initial request, this only triggers upon completion
							newmessage.gen_finished = new Date()
							newmessage.swipe_info[newmessage.swipe_id].gen_finished = new Date()
						}
					return createnew ?	[...messages , newmessage] : [...messages.slice(0,-1), newmessage]
					} catch (error) {
						console.log("Couldnt write due to:" + error + (write? "( This is a /generate response)" : "  (This is a /check response)"))
						return messages 
					} finally {
						if (write) {
							saveChatFile(messages, charName, currentChat)
						}
					}
				})		
			})
		}
		
		const handleError = (error, main = true) => {
			console.log("Response Fetch Failed: " + error)
			setNowGenerating(nowGenerating => false)
			if(main)
			ToastAndroid.show('Connection Lost...', ToastAndroid.SHORT)
		
		}
		
		const getgenerationstream = async () => {
			let response = null
			const interval = () => setTimeout(async () => {
				if(response === null) {
					await getresponse(`http://${endpoint}/api/extra/generate/check`).catch((error) => {
						handleError(error, false)
						response = ""
					})
					interval()
				} 
			}, 300);
			interval()
			getresponse(`http://${endpoint}/api/api/v1/generate`, true,  
			JSON.stringify(constructPayload()))
			.catch((error) => {
				handleError(error)
			}).finally(() => {
				setNowGenerating(false)
				response = ""
			})
		
		}

		getgenerationstream()

		return 
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			
			{ (charName === 'Welcome') ?
			<View>
				<Text style={styles.welcometext}> 
					Select A Character To Get Started!
				</Text>
			</View>
			
			:
			<MessageContext.Provider value={ [messages, setMessages]}>
			<View style={styles.container}>
				<ChatMenu messages={messages} />
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="Message..."
						placeholderTextColor={Color.Offwhite}
						value={newMessage}
						onChangeText={(text) => setNewMessage(text)}
						multiline={true}
					/>
					

					{ nowGenerating ?
					<TouchableOpacity style={styles.sendButton} onPress={()=> {
						axios.post(`http://${endpoint}/api/extra/abort`).then(() => {	
							setNowGenerating(false)
						})	
					}}>
					<Text>Stop</Text>
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
		flex:1
	},
	safeArea: {
		flex: 1,
		backgroundColor: Color.Background
	},

	welcometext : {
		justifyContent: 'center',
		margin: 40,
		fontSize:20,
		color: Color.White
	},

	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	input: {
		color: Color.White,
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
	
});

export default Home;


const createNewChat = (userName, characterName, initmessage) => {
	return [
		{"user_name":userName,"character_name":characterName,"create_date":humanizedISO8601DateTime(),"chat_metadata":{"note_prompt":"","note_interval":1,"note_position":1,"note_depth":4,"objective":{"currentObjectiveId":0,"taskTree":{"id":0,"description":"","completed":false,"parentId":"","children":[]},"checkFrequency":"3","chatDepth":"2","hideTasks":false,"prompts":{"createTask":"Pause your roleplay and generate a list of tasks to complete an objective. Your next response must be formatted as a numbered list of plain text entries. Do not include anything but the numbered list. The list must be prioritized in the order that tasks must be completed.\n\nThe objective that you must make a numbered task list for is: [{{objective}}].\nThe tasks created should take into account the character traits of {{char}}. These tasks may or may not involve {{user}} directly. Be sure to include the objective as the final task.\n\nGiven an example objective of 'Make me a four course dinner', here is an example output:\n1. Determine what the courses will be\n2. Find recipes for each course\n3. Go shopping for supplies with {{user}}\n4. Cook the food\n5. Get {{user}} to set the table\n6. Serve the food\n7. Enjoy eating the meal with {{user}}\n    ","checkTaskCompleted":"Pause your roleplay. Determine if this task is completed: [{{task}}].\nTo do this, examine the most recent messages. Your response must only contain either true or false, nothing other words.\nExample output:\ntrue\n    ","currentTask":"Your current task is [{{task}}]. Balance existing roleplay with completing this task."}}}},
		{"name":characterName,"is_user":false,"send_date":humanizedISO8601DateTime(),"mes":initmessage},
	]
}

const createChatEntry = (name, is_user, message) => {
	return {
		// important stuff
		"name":name,
		"is_user":is_user,
		"mes":message,
		
		// metadata
		"send_date":humanizedISO8601DateTime(),
		// gen_started
		// gen_finished
		"extra":{"api":"kobold","model":"concedo/koboldcpp"},
		"swipe_id":0,
		"swipes":[message],
		"swipe_info":[
			// metadata
			{	
				"send_date":humanizedISO8601DateTime(),
				"extra":{"api":"kobold","model":"concedo/koboldcpp"},
			},
		],
	}
}
function humanizedISO8601DateTime(date) {
    let baseDate = typeof date === 'number' ? new Date(date) : new Date();
    let humanYear = baseDate.getFullYear();
    let humanMonth = (baseDate.getMonth() + 1);
    let humanDate = baseDate.getDate();
    let humanHour = (baseDate.getHours() < 10 ? '0' : '') + baseDate.getHours();
    let humanMinute = (baseDate.getMinutes() < 10 ? '0' : '') + baseDate.getMinutes();
    let humanSecond = (baseDate.getSeconds() < 10 ? '0' : '') + baseDate.getSeconds();
    let humanMillisecond = (baseDate.getMilliseconds() < 10 ? '0' : '') + baseDate.getMilliseconds();
    let HumanizedDateTime = (humanYear + "-" + humanMonth + "-" + humanDate + " @" + humanHour + "h " + humanMinute + "m " + humanSecond + "s " + humanMillisecond + "ms");
    return HumanizedDateTime;
};
